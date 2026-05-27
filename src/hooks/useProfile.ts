import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/src/db/client';
import { profiles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getProfileId, setProfileId } from '@/src/utils/storage';
import { onMutationError } from '@/src/utils/mutationError';
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
      const id = await getProfileId();
      if (!id) return null;
      const res = await getDb().select().from(profiles).where(eq(profiles.id, id));
      return res[0] ?? null;
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => getDb().select().from(profiles),
  });
}
