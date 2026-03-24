import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refresh_token: refresh }
        );
        localStorage.setItem("access_token", data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const invoicesApi = {
  list: (params?: any) => api.get("/invoices", { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post("/invoices", data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  remind: (id: string) => api.post(`/invoices/${id}/remind`),
  recordPayment: (id: string, data: any) =>
    api.post(`/invoices/${id}/payment`, data),
  summary: () => api.get("/invoices/summary"),
};

export const clientsApi = {
  list: (search?: string) => api.get("/clients", { params: { search } }),
  create: (data: any) => api.post("/clients", data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
};

export const gstApi = {
  summary: (month: number, year: number) =>
    api.get("/gst/summary", { params: { month, year } }),
  gstr1: (month: number, year: number) =>
    api.get("/gst/gstr1", { params: { month, year } }),
  gstr3b: (month: number, year: number) =>
    api.get("/gst/gstr3b", { params: { month, year } }),
};

export const cashflowApi = {
  dashboard: () => api.get("/cashflow/dashboard"),
  predict: (periods?: number) =>
    api.get("/cashflow/predict", { params: { periods } }),
};

export const paymentsApi = {
  list: (params?: any) => api.get("/payments", { params }),
};

export const expensesApi = {
  list: (params?: any) => api.get("/expenses", { params }),
  create: (data: any) => api.post("/expenses", data),
};

export const businessApi = {
  get: () => api.get("/business"),
  update: (data: any) => api.put("/business", data),
};