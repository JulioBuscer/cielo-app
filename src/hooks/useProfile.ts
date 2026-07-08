import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { profiles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { resolveProfileId, setProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';
import { writeOutbox } from '@/src/sync/outbox';
import { signalPeers } from '@/src/sync/hooks';
import type { Role } from '@/src/constants/roles';

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role: Role }) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await getDb().insert(profiles).values({
        id, name: input.name, role: input.role,
        isDefault: true, createdAt: new Date(),
      });
      await writeOutbox('profiles', id, 'insert', { id, name: input.name, role: input.role });
      await signalPeers();
      await setProfileId(id);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
    onError: onMutationError("[useCreateProfile]"),
  });
}

export function useActiveProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const id = await resolveProfileId();
        const res = await getDb().select().from(profiles).where(eq(profiles.id, id));
        return res[0] ?? null;
      } catch {
        return null;
      }
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => getDb().select().from(profiles),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; role: Role }) => {
      await getDb().update(profiles).set({
        name: input.name,
        role: input.role,
        updatedAt: new Date(),
      }).where(eq(profiles.id, input.id));
      await writeOutbox('profiles', input.id, 'update', input);
      await signalPeers();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: onMutationError("[useUpdateProfile]"),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; deletedBy: string }) => {
      await getDb().update(profiles).set({
        deletedAt: new Date(),
        deletedBy: input.deletedBy,
      }).where(eq(profiles.id, input.id));
      await writeOutbox('profiles', input.id, 'delete', { id: input.id, deletedBy: input.deletedBy });
      await signalPeers();
      if (input.id === await resolveProfileId()) {
        const all = await getDb().select({ id: profiles.id }).from(profiles);
        const remaining = all.filter(p => p.id !== input.id);
        if (remaining.length > 0) {
          await setProfileId(remaining[0].id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: onMutationError("[useDeleteProfile]"),
  });
}
