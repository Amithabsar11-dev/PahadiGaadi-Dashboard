import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStore = create(
  persist(
    (set) => ({
      adminId: null,
      adminRole: null,
      adminName: null,
      setAdminId: (id) => set({ adminId: id }),
      setAdminRole: (role) => set({ adminRole: role }),
      setAdminName: (name) => set({ adminName: name })
    }),
    { name: 'admin-store' }
  )
);

