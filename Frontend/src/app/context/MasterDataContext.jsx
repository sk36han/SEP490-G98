import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCategoryList } from '../../shared/lib/categoryService';
import { getSuppliers } from '../../shared/lib/supplierService';
import { getWarehouses } from '../../shared/lib/warehouseService';
import { getBrandList } from '../../shared/lib/brandService';
import { getUomList } from '../../shared/lib/uomService';
import { getAccountants } from '../../shared/lib/userService';
import { getReceivers } from '../../shared/lib/receiverService';
import authService from '../../shared/lib/authService';

const MasterDataContext = createContext(null);

export function MasterDataProvider({ children }) {
  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  // Suppliers
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState(null);

  // Warehouses
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [warehousesError, setWarehousesError] = useState(null);

  // Brands
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState(null);

  // UOMs
  const [uoms, setUoms] = useState([]);
  const [uomsLoading, setUomsLoading] = useState(false);
  const [uomsError, setUomsError] = useState(null);

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // Receivers
  const [receivers, setReceivers] = useState([]);
  const [receiversLoading, setReceiversLoading] = useState(false);
  const [receiversError, setReceiversError] = useState(null);

  const fetchCategories = useCallback(async (force = false) => {
    if (!force && categories.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const result = await getCategoryList({ page: 1, pageSize: 100 });
      setCategories(result.items || []);
    } catch (err) {
      setCategoriesError(err.message);
    } finally {
      setCategoriesLoading(false);
    }
  }, [categories.length]);

  const fetchSuppliers = useCallback(async (force = false) => {
    if (!force && suppliers.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setSuppliersLoading(true);
    setSuppliersError(null);
    try {
      const result = await getSuppliers({ page: 1, pageSize: 100 });
      setSuppliers(result.items || []);
    } catch (err) {
      setSuppliersError(err.message);
    } finally {
      setSuppliersLoading(false);
    }
  }, [suppliers.length]);

  const fetchWarehouses = useCallback(async (force = false) => {
    if (!force && warehouses.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setWarehousesLoading(true);
    setWarehousesError(null);
    try {
      const result = await getWarehouses({ pageNumber: 1, pageSize: 100 });
      setWarehouses(result.items || []);
    } catch (err) {
      setWarehousesError(err.message);
    } finally {
      setWarehousesLoading(false);
    }
  }, [warehouses.length]);

  const fetchBrands = useCallback(async (force = false) => {
    if (!force && brands.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setBrandsLoading(true);
    setBrandsError(null);
    try {
      const result = await getBrandList({ page: 1, pageSize: 100 });
      setBrands(result.items || []);
    } catch (err) {
      setBrandsError(err.message);
    } finally {
      setBrandsLoading(false);
    }
  }, [brands.length]);

  const fetchUoms = useCallback(async (force = false) => {
    if (!force && uoms.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setUomsLoading(true);
    setUomsError(null);
    try {
      const result = await getUomList({ page: 1, pageSize: 100 });
      setUoms(result.items || []);
    } catch (err) {
      setUomsError(err.message);
    } finally {
      setUomsLoading(false);
    }
  }, [uoms.length]);

  const fetchUsers = useCallback(async (force = false) => {
    if (!force && users.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const result = await getAccountants();
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [users.length]);

  const fetchReceivers = useCallback(async (force = false) => {
    if (!force && receivers.length > 0) return;
    if (!authService.isAuthenticated()) return;
    setReceiversLoading(true);
    setReceiversError(null);
    try {
      const result = await getReceivers({ page: 1, pageSize: 100 });
      setReceivers(result.items || []);
    } catch (err) {
      setReceiversError(err.message);
    } finally {
      setReceiversLoading(false);
    }
  }, [receivers.length]);

  // Initial load - only fetch when user is authenticated (token + no OTP pending)
  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchCategories();
      fetchSuppliers();
      fetchWarehouses();
      fetchBrands();
      fetchUoms();
      fetchUsers();
      fetchReceivers();
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchCategories(true);
    fetchSuppliers(true);
    fetchWarehouses(true);
    fetchBrands(true);
    fetchUoms(true);
    fetchUsers(true);
    fetchReceivers(true);
  }, [fetchCategories, fetchSuppliers, fetchWarehouses, fetchBrands, fetchUoms, fetchUsers, fetchReceivers]);

  const value = {
    categories, categoriesLoading, categoriesError, fetchCategories,
    suppliers, suppliersLoading, suppliersError, fetchSuppliers,
    warehouses, warehousesLoading, warehousesError, fetchWarehouses,
    brands, brandsLoading, brandsError, fetchBrands,
    uoms, uomsLoading, uomsError, fetchUoms,
    users, usersLoading, usersError, fetchUsers,
    receivers, receiversLoading, receiversError, fetchReceivers,
    refreshAll,
  };

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) throw new Error('useMasterData must be used within a MasterDataProvider');
  return context;
}

export function useCategories() {
  const { categories, categoriesLoading, categoriesError, fetchCategories } = useMasterData();
  return { categories, loading: categoriesLoading, error: categoriesError, fetchCategories };
}

export function useSuppliers() {
  const { suppliers, suppliersLoading, suppliersError, fetchSuppliers } = useMasterData();
  return { suppliers, loading: suppliersLoading, error: suppliersError, fetchSuppliers };
}

export function useWarehouses() {
  const { warehouses, warehousesLoading, warehousesError, fetchWarehouses } = useMasterData();
  return { warehouses, loading: warehousesLoading, error: warehousesError, fetchWarehouses };
}

export function useBrands() {
  const { brands, brandsLoading, brandsError, fetchBrands } = useMasterData();
  return { brands, loading: brandsLoading, error: brandsError, fetchBrands };
}

export function useUoms() {
  const { uoms, uomsLoading, uomsError, fetchUoms } = useMasterData();
  return { uoms, loading: uomsLoading, error: uomsError, fetchUoms };
}

export function useUsers() {
  const { users, usersLoading, usersError, fetchUsers } = useMasterData();
  return { users, loading: usersLoading, error: usersError, fetchUsers };
}

export function useReceivers() {
  const { receivers, receiversLoading, receiversError, fetchReceivers } = useMasterData();
  return { receivers, loading: receiversLoading, error: receiversError, fetchReceivers };
}
