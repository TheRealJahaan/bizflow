import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../lib/api";

export function useClients(search?: string) {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientsApi.list(search).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}