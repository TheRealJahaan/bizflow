import { useQuery } from "@tanstack/react-query";
import { cashflowApi } from "../lib/api";

export function useCashFlowDashboard() {
  return useQuery({
    queryKey: ["cashflow-dashboard"],
    queryFn: () => cashflowApi.dashboard().then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

export function usePredictions(periods = 3) {
  return useQuery({
    queryKey: ["predictions", periods],
    queryFn: () => cashflowApi.predict(periods).then((r) => r.data),
    staleTime: 10 * 60_000,
  });
}