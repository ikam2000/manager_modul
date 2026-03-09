import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QrCode, Download, Trash2, Ban, Upload, FolderOpen, ChevronDown, ChevronUp, ChevronRight, X, Maximize2, Plus, Settings2 } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import { useAuth } from '../../contexts/AuthContext'
import { authFetch, authFetchWithRetry, TokenRefreshedError } from '../../lib/authFetch'

const LIMIT_OPTIONS = [
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 150, label: '150' },
  { value: 500, label: 'все' },
] as const

const ENTITY_TABS = [
  { key: 'nomenclature', label: 'Номенклатура' },
  { key: 'suppliers', label: 'Поставщики' },
  { key: 'manufacturers', label: 'Производители' },
  { key: 'customers', label: 'Заказчики' },
  { key: 'supplies', label: 'Поставки' },
  { key: 'categories', label: 'Категории' },
  { key: 'subcategories', label: 'Подкатегории' },
]

function useEntities<T>(endpoint: string, params?: Record<string, string>, refreshKey?: number) {
  const [data, setData] = useState<{ items: T[]; total: number }>({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    fetch(`/entities/${endpoint}${qs}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false))
  }, [endpoint, params ? JSON.stringify(params) : '', refreshKey])

  return { ...data, loading }
}

const VALID_TABS = ['nomenclature', 'suppliers', 'manufacturers', 'customers', 'supplies', 'categories', 'subcategories']

const NOMENCLATURE_STANDARD_FIELDS = [
  { v: '', lbl: '— не импортировать —' },
  { v: 'code', lbl: 'Код / Артикул' },
  { v: 'name', lbl: 'Наименование' },
  { v: 'tag_number', lbl: 'Таговый №' },
  { v: 'package_number', lbl: '№ груз. места' },
  { v: 'manufacturer', lbl: 'Производитель' },
  { v: 'quantity', lbl: 'Количество' },
  { v: 'shipping_number', lbl: 'Номер отгружаемого' },
  { v: 'storage_conditions', lbl: 'Условия хранения' },
  { v: 'packaging_type', lbl: 'Тип упаковки' },
  { v: 'length_cm', lbl: 'Длина, см' },
  { v: 'width_cm', lbl: 'Ширина, см' },
  { v: 'height_cm', lbl: 'Высота, см' },
  { v: 'net_weight_unit', lbl: 'Вес нетто за ед., кг' },
  { v: 'total_net_weight', lbl: 'Итоговый вес нетто' },
  { v: 'total_gross_weight', lbl: 'Итоговый вес брутто' },
  { v: 'price_without_vat', lbl: 'Цена без НДС' },
  { v: 'price_with_vat', lbl: 'Цена с НДС' },
]

const NOMENCLATURE_TABLE_COLUMNS = [
  { key: 'code', label: 'Код', sortKey: 'code' },
  { key: 'name', label: 'Наименование', sortKey: 'name' },
  { key: 'tag_number', label: 'Таговый №', sortKey: 'tag_number' },
  { key: 'package_number', label: '№ груз. места', sortKey: 'package_number' },
  { key: 'quantity', label: 'Количество' },
  { key: 'shipping_number', label: 'Номер отгружаемого' },
  { key: 'storage_conditions', label: 'Условия хранения' },
  { key: 'packaging_type', label: 'Тип упаковки' },
  { key: 'length_cm', label: 'Длина, см' },
  { key: 'width_cm', label: 'Ширина, см' },
  { key: 'height_cm', label: 'Высота, см' },
  { key: 'net_weight_unit', label: 'Вес нетто за ед.' },
  { key: 'total_net_weight', label: 'Вес нетто итого' },
  { key: 'total_gross_weight', label: 'Вес брутто итого' },
  { key: 'price_without_vat', label: 'Цена без НДС' },
  { key: 'price_with_vat', label: 'Цена с НДС' },
]

const SUPPLY_TABLE_COLUMNS = [
  { key: 'id', label: 'ID', sortKey: 'id' },
  { key: 'supplier_name', label: 'Поставщик' },
  { key: 'nomenclature_name', label: 'Номенклатура' },
  { key: 'quantity', label: 'Количество', sortKey: 'quantity' },
  { key: 'delivery_date', label: 'Дата поставки', sortKey: 'created_at' },
  { key: 'production_date', label: 'Дата изготовления' },
  { key: 'manufacturer_name', label: 'Производитель', sortKey: 'manufacturer' },
  { key: 'category_name', label: 'Категория', sortKey: 'category' },
  { key: 'subcategory_name', label: 'Подкатегория', sortKey: 'subcategory' },
]
export default function CabinetEntities() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'nomenclature'
  const { user } = useAuth()
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const roleFromToken = token ? (() => { try { const p = JSON.parse(atob(token.split('.')[1])); return p.role || ''; } catch { return ''; } })() : ''
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'trader' || roleFromToken === 'admin' || roleFromToken === 'super_admin' || roleFromToken === 'trader'
  const canDelete = (user?.permissions?.can_delete_entities ?? isAdmin) as boolean
  const [tab, setTab] = useState(initialTab)
  useEffect(() => { if (tabParam && VALID_TABS.includes(tabParam)) setTab(tabParam) }, [tabParam])
  const supplierParam = searchParams.get('supplier')
  useEffect(() => {
    if (supplierParam && supplierParam !== supplierId) {
      setTab('nomenclature')
      setSupplierId(supplierParam)
      setCategoryId('')
      setSubcategoryId('')
      setManufacturerId('')
    }
  }, [supplierParam])
  const [search, setSearch] = useState('')
  const [qrModal, setQrModal] = useState<{ url: string; code?: string; id: number } | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const [refreshKey, setRefreshKey] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [recognizeResults, setRecognizeResults] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<number, Array<{ entity_type: string; entity_id: number }>>>({})
  const [columnMappings, setColumnMappings] = useState<Record<number, Record<number, { mapTo: string; newName?: string }>>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [limitReachedInfo, setLimitReachedInfo] = useState<{ message: string; url: string } | null>(null)
  const [createModal, setCreateModal] = useState<{ fileIndex: number; type: 'nomenclature'; prefill?: { code?: string; name?: string; tag_number?: string; package_number?: string } } | { fileIndex: number; type: 'supplier'; prefill?: { name?: string } } | null>(null)
  const [newNomCode, setNewNomCode] = useState('')
  const [newNomName, setNewNomName] = useState('')
  const [newNomTag, setNewNomTag] = useState('')
  const [newNomPackage, setNewNomPackage] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedNomIds, setSelectedNomIds] = useState<Set<number>>(new Set())
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [subcategoryId, setSubcategoryId] = useState<string>('')
  const [manufacturerId, setManufacturerId] = useState<string>('')
  const [supplierId, setSupplierId] = useState<string>('')
  const [entityTree, setEntityTree] = useState<{
    categories: Array<{ id: number; name: string; subcategories: Array<{ id: number; name: string }> }>;
    suppliers: Array<{ id: number; name: string }>;
    manufacturers: Array<{ id: number; name: string }>;
    contracts?: Array<{ id: number; name: string; supplier_id?: number }>;
    nomenclature_custom_fields?: string[];
  } | null>(null)
  const [entityTreeLoading, setEntityTreeLoading] = useState(false)
  const [entityTreeError, setEntityTreeError] = useState<string | null>(null)
  const [mappingFullscreen, setMappingFullscreen] = useState(false)
  const [linkModal, setLinkModal] = useState<'category' | 'supplier' | 'manufacturer' | null>(null)
  const [linkSelectedId, setLinkSelectedId] = useState<string>('')
  const [linkConfirming, setLinkConfirming] = useState(false)
  const [importCategoryId, setImportCategoryId] = useState<string>('')
  const [importSubcategoryId, setImportSubcategoryId] = useState<string>('')
  const [importSupplierId, setImportSupplierId] = useState<string>('')
  const [importDeliveryDate, setImportDeliveryDate] = useState<string>('')
  const [importRowSelection, setImportRowSelection] = useState<Record<number, Set<number>>>({})
  const [nomColumnVisibility, setNomColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('ikamdocs_nom_columns')
      if (s) {
        const parsed = JSON.parse(s) as Record<string, boolean>
        const def: Record<string, boolean> = {}
        NOMENCLATURE_TABLE_COLUMNS.forEach((c) => { def[c.key] = parsed[c.key] ?? true })
        return def
      }
    } catch (_) {}
    const def: Record<string, boolean> = {}
    NOMENCLATURE_TABLE_COLUMNS.forEach((c) => { def[c.key] = true })
    return def
  })
  const [nomColumnsModalOpen, setNomColumnsModalOpen] = useState(false)
  const [supplyColumnsModalOpen, setSupplyColumnsModalOpen] = useState(false)
  const [supplyColumnVisibility, setSupplyColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('ikamdocs_supply_columns')
      if (s) {
        const parsed = JSON.parse(s) as Record<string, boolean>
        const def: Record<string, boolean> = {}
        SUPPLY_TABLE_COLUMNS.forEach((c) => { def[c.key] = parsed[c.key] ?? true })
        return def
      }
    } catch (_) {}
    const def: Record<string, boolean> = {}
    SUPPLY_TABLE_COLUMNS.forEach((c) => { def[c.key] = true })
    return def
  })
  const [supplySupplierId, setSupplySupplierId] = useState<string>('')
  const [supplyDate, setSupplyDate] = useState<string>('')
  const [useSupplyDate, setUseSupplyDate] = useState(false)
  const [supplyContractId, setSupplyContractId] = useState<string>('')
  const [supplyBuyerName, setSupplyBuyerName] = useState<string>('')
  const [supplyShippingAddress, setSupplyShippingAddress] = useState<string>('')
  const [supplyDeliveryAddress, setSupplyDeliveryAddress] = useState<string>('')
  const [supplyItemDecisions, setSupplyItemDecisions] = useState<Record<number, { action: 'merge' | 'new'; nomenclature_id?: number }>>({})
  const [supplyInnSearch, setSupplyInnSearch] = useState('')
  const [supplyInnCreateLoading, setSupplyInnCreateLoading] = useState(false)
  const [importInnSearch, setImportInnSearch] = useState('')
  const [importInnCreateLoading, setImportInnCreateLoading] = useState(false)
  const [manualSupplyOpen, setManualSupplyOpen] = useState(false)
  const [manualSupplyFullscreen, setManualSupplyFullscreen] = useState(false)
  const [manualSupplierId, setManualSupplierId] = useState<string>('')
  const [manualConsignorId, setManualConsignorId] = useState<string>('')
  const [manualConsigneeId, setManualConsigneeId] = useState<string>('')
  const [manualBuyerId, setManualBuyerId] = useState<string>('')
  const [manualContractNumberDate, setManualContractNumberDate] = useState<string>('')
  const [manualSpecNumberDate, setManualSpecNumberDate] = useState<string>('')
  const [manualTnNumber, setManualTnNumber] = useState<string>('')
  const [manualPackingListNumber, setManualPackingListNumber] = useState<string>('')
  const [manualNomItems, setManualNomItems] = useState<Array<{ key: string; nomenclature_id: number; quantity: number; name?: string; code?: string | null }>>([])
  const [manualProdDate, setManualProdDate] = useState<string>('')
  const [manualSupplySearch, setManualSupplySearch] = useState({ supplier: '', consignor: '', consignee: '', buyer: '', nomenclature: '' })
  const [allNomenclature, setAllNomenclature] = useState<{ id: number; name: string; code: string | null }[]>([])
  const [manualSupplyCreating, setManualSupplyCreating] = useState(false)
  const [manualAddNomId, setManualAddNomId] = useState<string>('')
  const [manualAddQuantity, setManualAddQuantity] = useState<string>('1')
  const [manualNewSupplierName, setManualNewSupplierName] = useState('')
  const [manualCreatingSupplier, setManualCreatingSupplier] = useState(false)
  const [manualNewNomName, setManualNewNomName] = useState('')
  const [manualNewNomCode, setManualNewNomCode] = useState('')
  const [manualCreatingNom, setManualCreatingNom] = useState(false)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [filterSupplierId, setFilterSupplierId] = useState<string>('')
  const [sidebarExpandedEntity, setSidebarExpandedEntity] = useState<'suppliers' | 'manufacturers' | 'supplies' | null>(null)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [createCategoryName, setCreateCategoryName] = useState('')
  const [createCategoryLoading, setCreateCategoryLoading] = useState(false)
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false)
  const [createSubcategoryCategoryId, setCreateSubcategoryCategoryId] = useState<string>('')
  const [createSubcategoryName, setCreateSubcategoryName] = useState('')
  const [createSubcategoryLoading, setCreateSubcategoryLoading] = useState(false)
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false)
  const [createSupplierName, setCreateSupplierName] = useState('')
  const [createSupplierPhone, setCreateSupplierPhone] = useState('')
  const [createSupplierAddress, setCreateSupplierAddress] = useState('')
  const [createSupplierInn, setCreateSupplierInn] = useState('')
  const [createSupplierFile, setCreateSupplierFile] = useState<File | null>(null)
  const [createSupplierLoading, setCreateSupplierLoading] = useState(false)
  const [createSupplierInnLookupLoading, setCreateSupplierInnLookupLoading] = useState(false)
  const [createManufacturerOpen, setCreateManufacturerOpen] = useState(false)
  const [createManufacturerName, setCreateManufacturerName] = useState('')
  const [createManufacturerAddress, setCreateManufacturerAddress] = useState('')
  const [createManufacturerInn, setCreateManufacturerInn] = useState('')
  const [createManufacturerFile, setCreateManufacturerFile] = useState<File | null>(null)
  const [createManufacturerLoading, setCreateManufacturerLoading] = useState(false)
  const [createManufacturerInnLookupLoading, setCreateManufacturerInnLookupLoading] = useState(false)
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false)
  const [createCustomerName, setCreateCustomerName] = useState('')
  const [createCustomerInn, setCreateCustomerInn] = useState('')
  const [createCustomerAddress, setCreateCustomerAddress] = useState('')
  const [createCustomerPhone, setCreateCustomerPhone] = useState('')
  const [createCustomerLoading, setCreateCustomerLoading] = useState(false)
  const [createCustomerInnLookupLoading, setCreateCustomerInnLookupLoading] = useState(false)
  useEffect(() => { setSelectedNomIds(new Set()); setSelectedSupplyIds(new Set()) }, [tab])
  useEffect(() => { setOffset(0) }, [tab, search, categoryId, subcategoryId, manufacturerId, supplierId, filterCategoryId, filterSupplierId])
  useEffect(() => { setSubcategoryId('') }, [categoryId])
  useEffect(() => { setFilterCategoryId(''); setFilterSupplierId('') }, [tab])
  useEffect(() => {
    const sel: Record<number, Set<number>> = {}
    recognizeResults.forEach((f: any, fi: number) => {
      const rows = f.extracted_structured?.rows_data || []
      if (rows.length) sel[fi] = new Set(rows.map((_: any, ri: number) => ri))
    })
    setImportRowSelection(sel)
  }, [recognizeResults])
  const fetchEntityTree = useCallback((retry = false) => {
    const t = localStorage.getItem('access_token')
    if (!t) return Promise.resolve(null)
    setEntityTreeLoading(true)
    setEntityTreeError(null)
    return fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${t}` } })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setEntityTree(data)
          setEntityTreeError(null)
          return data
        }
        const errBody = await r.json().catch(() => ({}))
        const errMsg = errBody?.detail?.message || errBody?.detail || (r.status ? `HTTP ${r.status}` : 'Ошибка загрузки')
        setEntityTreeError(String(errMsg))
        if (!retry) setTimeout(() => fetchEntityTree(true), 3000)
        return null
      })
      .catch((e) => {
        if (!retry) setTimeout(() => fetchEntityTree(true), 3000)
        else setEntityTreeError(e?.message || 'Ошибка сети')
        return null
      })
      .finally(() => setEntityTreeLoading(false))
  }, [])
  useEffect(() => {
    const needsTree = ['nomenclature', 'categories', 'subcategories', 'supplies'].includes(tab)
    if (needsTree && !entityTree && !entityTreeLoading) fetchEntityTree()
  }, [tab, entityTree, entityTreeLoading, fetchEntityTree])
  useEffect(() => {
    if (!(tab === 'supplies' && manualSupplyOpen)) {
      setAllNomenclature([])
      return
    }
    const search = manualSupplySearch.nomenclature.trim()
    const timer = setTimeout(() => {
      const t = localStorage.getItem('access_token')
      const url = search.length >= 2
        ? `/entities/nomenclature?limit=100&search=${encodeURIComponent(search)}`
        : '/entities/nomenclature?limit=500'
      fetch(url, { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => r.ok ? r.json() : { items: [] })
        .then((d) => setAllNomenclature((d.items || []).map((n: any) => ({ id: n.id, name: n.name || '', code: n.code || null }))))
        .catch(() => setAllNomenclature([]))
    }, search.length >= 2 ? 350 : 0)
    return () => clearTimeout(timer)
  }, [tab, manualSupplyOpen, manualSupplySearch.nomenclature])
  const endpoint = tab === 'subcategories' ? 'subcategories' : tab
  const entityParams: Record<string, string> = {}
  if (search) entityParams.search = search
  const hasLimit = ['nomenclature', 'suppliers', 'manufacturers', 'customers', 'categories', 'subcategories', 'supplies'].includes(tab)
  if (hasLimit) {
    entityParams.limit = String(limit)
    entityParams.offset = String(offset)
  }
  if (tab === 'nomenclature') {
    if (categoryId) entityParams.category_id = categoryId
    if (subcategoryId) entityParams.subcategory_id = subcategoryId
    if (manufacturerId) entityParams.manufacturer_id = manufacturerId
    if (supplierId) entityParams.supplier_id = supplierId
    if (sortBy) {
      entityParams.sort_by = sortBy
      entityParams.sort_order = sortOrder
    }
  } else if (tab === 'suppliers' || tab === 'manufacturers' || tab === 'customers') {
    if (sortOrder) entityParams.sort_order = sortOrder
  } else if (tab === 'categories') {
    if (sortBy) entityParams.sort_by = sortBy || 'name'
    entityParams.sort_order = sortOrder
  } else if (tab === 'subcategories') {
    if (filterCategoryId) entityParams.category_id = filterCategoryId
    if (sortBy) entityParams.sort_by = sortBy || 'name'
    entityParams.sort_order = sortOrder
  } else if (tab === 'supplies') {
    if (filterSupplierId) entityParams.supplier_id = filterSupplierId
    if (sortBy) entityParams.sort_by = sortBy || 'created_at'
    entityParams.sort_order = sortOrder
  }
  const { items, total, loading } = useEntities<any[]>(endpoint, Object.keys(entityParams).length ? entityParams : undefined, refreshKey)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = Array.from(e.target.files || [])
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip']
    setFiles((prev) => [...prev, ...fl.filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)))])
    e.target.value = ''
  }
  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = Array.from(e.target.files || [])
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx']
    setFiles((prev) => [...prev, ...fl.filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)))])
    e.target.value = ''
  }
  const removeFile = (idx: number) => {
    setFiles((p) => p.filter((_, i) => i !== idx))
    setRecognizeResults((p) => p.filter((_, i) => i !== idx))
    setAssignments((p) => {
      const next: Record<number, Array<{ entity_type: string; entity_id: number }>> = {}
      Object.entries(p).forEach(([k, v]) => {
        const ki = parseInt(k, 10)
        if (ki < idx) next[ki] = v
        else if (ki > idx) next[ki - 1] = v
      })
      return next
    })
    setColumnMappings((p) => {
      const next: Record<number, Record<number, { mapTo: string; newName?: string }>> = {}
      Object.entries(p).forEach(([k, v]) => {
        const ki = parseInt(k, 10)
        if (ki < idx) next[ki] = v
        else if (ki > idx) next[ki - 1] = v
      })
      return next
    })
  }
  const runRecognize = useCallback(async () => {
    if (!token || files.length === 0) return
    setUploading(true)
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    try {
      const r = await authFetch('/documents/recognize', { method: 'POST', body: fd })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.files) {
        setRecognizeResults(d.files)
        // Автосопоставление колонок по названиям (длина→length_cm, вес→net_weight_unit и т.д.)
        const autoMaps: Record<number, Record<number, { mapTo: string; newName?: string }>> = {}
        const colNameToField: Record<string, string> = {
          'код': 'code', 'артикул': 'code', 'наименование': 'name', 'название': 'name',
          'таговый': 'tag_number', 'марка': 'tag_number', 'маркировка': 'tag_number', 'маркировка на': 'tag_number',
          'груз': 'package_number', 'место': 'package_number', 'грузового места': 'package_number',
          'кол-во': 'quantity', 'количество': 'quantity',
          'производитель': 'manufacturer', 'отгружа': 'shipping_number', 'отгружаемого': 'shipping_number', 'позици': 'shipping_number',
          'хранен': 'storage_conditions', 'упаковк': 'packaging_type', 'тип упаковки': 'packaging_type',
          'длина': 'length_cm', 'длина, см': 'length_cm', 'ширина': 'width_cm', 'ширина, см': 'width_cm',
          'высота': 'height_cm', 'высота, см': 'height_cm',
          'вес нетто': 'net_weight_unit', 'нетто за': 'net_weight_unit', 'вес нетто за': 'net_weight_unit',
          'вес брутто': 'total_gross_weight', 'итого нетто': 'total_net_weight',
          'цена без': 'price_without_vat', 'цена с': 'price_with_vat', 'price': 'price_without_vat',
        }
        d.files.forEach((f: any, fi: number) => {
          const cols = f.extracted_structured?.detected_columns || []
          if (!cols.length) return
          autoMaps[fi] = {}
          cols.forEach((col: any) => {
            const ci = col.index
            const name = (col.name || '').toLowerCase()
            for (const [kw, field] of Object.entries(colNameToField)) {
              if (name.includes(kw)) { autoMaps[fi][ci] = { mapTo: field }; break }
            }
          })
        })
        if (Object.keys(autoMaps).some((fi) => Object.keys(autoMaps[Number(fi)]).length > 0)) {
          setColumnMappings((prev) => {
            const next = { ...prev }
            Object.entries(autoMaps).forEach(([fi, map]) => {
              if (Object.keys(map).length > 0) next[Number(fi)] = { ...(next[Number(fi)] || {}), ...map }
            })
            return next
          })
        }
        const first = d.files[0]
        if (first?.extracted_structured?.supply_document && tab === 'supplies') {
          const sd = first.extracted_structured.supply_date_detected
          if (sd) setSupplyDate(sd)
          const bySupplier = (first.suggested || []).filter((s: any) => s.entity_type === 'supplier')
          if (bySupplier[0]) setSupplySupplierId(String(bySupplier[0].entity_id))
          const h = first.extracted_structured.header || {}
          if (h.покупатель) setSupplyBuyerName(h.покупатель)
          if (h.адрес_отгрузки) setSupplyShippingAddress(h.адрес_отгрузки)
          if (h.адрес_поставки) setSupplyDeliveryAddress(h.адрес_поставки)
          const decisions: Record<number, { action: 'merge' | 'new'; nomenclature_id?: number }> = {}
          const items = first.extracted_structured.nomenclature_items || []
          items.forEach((it: any, idx: number) => {
            const best = it.match_candidates?.[0]
            decisions[idx] = best ? { action: 'merge', nomenclature_id: best.nomenclature_id } : { action: 'new' }
          })
          setSupplyItemDecisions(decisions)
        }
      } else {
        const msg = Array.isArray(d.detail) ? d.detail.map((x: any) => x?.msg ?? String(x)).join('; ') : (typeof d.detail === 'string' ? d.detail : (d.detail?.message || d.detail?.detail || 'Ошибка распознавания'))
        const statusPart = r.status ? ` [HTTP ${r.status}]` : ''
        alert((msg || 'Ошибка распознавания') + statusPart)
      }
    } catch (e) {
      if (e instanceof TokenRefreshedError) {
        return runRecognize()
      }
      alert(e instanceof Error ? e.message : 'Ошибка сети')
    } finally {
      setUploading(false)
    }
  }, [token, files, tab])
  const doUploadRecognize = useCallback(async () => {
    if (!token || files.length === 0) return
    const hasSupplyImport = tab === 'supplies' && recognizeResults[0]?.extracted_structured?.supply_document
    if (hasSupplyImport) {
      const sid = supplySupplierId ? parseInt(supplySupplierId, 10) : null
      if (!sid) {
        alert('Выберите поставщика')
        return
      }
      setUploading(true)
      const first = recognizeResults[0]
      const nomItems = first?.extracted_structured?.nomenclature_items || []
      const itemsPayload = nomItems.map((it: any, idx: number) => {
        const dec = supplyItemDecisions[idx] || { action: 'new' }
        return {
          row_index: idx,
          action: dec.action,
          nomenclature_id: dec.nomenclature_id,
          quantity: it.quantity ?? 1,
          code: it.article || it.code,
          name: it.name,
          tag_number: it.tag_number,
          package_number: it.package_number,
          manufacturer_name: it.manufacturer,
        }
      })
      const fd = new FormData()
      files.forEach((f) => fd.append('files', f))
      fd.append('supplier_id', String(sid))
      fd.append('use_supply_date', String(useSupplyDate))
      if (useSupplyDate && supplyDate) fd.append('supply_date', supplyDate)
      if (supplyContractId) fd.append('contract_id', supplyContractId)
      if (supplyBuyerName?.trim()) fd.append('buyer_name', supplyBuyerName.trim())
      if (supplyShippingAddress?.trim()) fd.append('shipping_address', supplyShippingAddress.trim())
      if (supplyDeliveryAddress?.trim()) fd.append('delivery_address', supplyDeliveryAddress.trim())
      fd.append('items', JSON.stringify(itemsPayload))
      try {
        const r = await authFetch('/documents/import-supplies', { method: 'POST', body: fd })
        const d = await r.json().catch(() => ({}))
        if (r.ok) {
          setUploadSuccess(`Создано поставок: ${d.created ?? 0}`)
          if (d.limit_reached && d.subscription_url) {
            setLimitReachedInfo({ message: d.limit_message || 'Достигнут лимит. Оформите подписку для расширения.', url: d.subscription_url })
            setTimeout(() => setLimitReachedInfo(null), 15000)
          } else setLimitReachedInfo(null)
          setTimeout(() => setUploadSuccess(''), 5000)
          setFiles([])
          setRecognizeResults([])
          setSupplyItemDecisions({})
          setEntityTree(null)
          setRefreshKey((k) => k + 1)
        } else alert(d.detail || 'Ошибка импорта')
      } catch (e) {
        if (e instanceof TokenRefreshedError) {
          return doUploadRecognize()
        }
        alert(e instanceof Error ? e.message : 'Ошибка сети')
      } finally {
        setUploading(false)
      }
      return
    }
    const assignsList: { file_index: number; entity_type: string; entity_id: number }[] = []
    recognizeResults.forEach((_: any, i: number) => {
      (assignments[i] || []).forEach((a) => assignsList.push({ file_index: i, entity_type: a.entity_type, entity_id: a.entity_id }))
    })
    const hasImportMappings = recognizeResults.some((f: any, fi: number) => {
      const cols = f.extracted_structured?.detected_columns
      if (!cols?.length) return false
      const map = columnMappings[fi]
      if (!map) return false
      return Object.values(map).some((m) => m?.mapTo && m.mapTo !== '')
    })
    if (assignsList.length === 0 && !hasImportMappings) {
      alert('Выберите привязку хотя бы для одного файла или сопоставьте колонки для импорта номенклатуры')
      return
    }
    if (hasImportMappings && !importSupplierId && !confirm('Поставщик не выбран — поставки не будут созданы. Продолжить импорт без поставок?')) {
      return
    }
    setUploading(true)
    const fd = new FormData()
    try {
      if (hasImportMappings) {
        const mapPayload: Record<string, Record<string, { mapTo: string; newName?: string }>> = {}
        recognizeResults.forEach((f: any, fi: number) => {
          if (!f.extracted_structured?.detected_columns?.length) return
          const m = columnMappings[fi]
          if (!m) return
          mapPayload[String(fi)] = {}
          Object.entries(m).forEach(([ci, v]) => {
            if (v?.mapTo) mapPayload[String(fi)][ci] = { mapTo: v.mapTo, newName: v.newName }
          })
        })
        fd.append('column_mappings', JSON.stringify(mapPayload))
        if (importCategoryId) fd.append('category_id', String(importCategoryId))
        if (importSubcategoryId) fd.append('subcategory_id', String(importSubcategoryId))
        if (importSupplierId) fd.append('supplier_id', String(importSupplierId).trim())
        if (importDeliveryDate) fd.append('delivery_date', String(importDeliveryDate).trim())
        const rowIndicesPayload: Record<string, number[]> = {}
        let hasPartialSelection = false
        recognizeResults.forEach((f: any, fi: number) => {
          const rows = f.extracted_structured?.rows_data || []
          const sel = importRowSelection[fi]
          if (rows.length && sel && sel.size < rows.length) {
            hasPartialSelection = true
            rowIndicesPayload[String(fi)] = Array.from(sel).sort((a, b) => a - b)
          }
        })
        if (hasPartialSelection) fd.append('row_indices', JSON.stringify(rowIndicesPayload))
        files.forEach((f) => fd.append('files', f))
        const r = await authFetch('/documents/import-nomenclature', { method: 'POST', body: fd })
        const d = await r.json().catch(() => ({}))
        if (r.ok) {
          const created = d.created ?? 0
          const updated = d.updated ?? 0
          const supplies = d.supplies ?? 0
          const parts = []
          if (created > 0) parts.push(`${created} позиций номенклатуры создано`)
          if (updated > 0) parts.push(`${updated} обновлено`)
          if (supplies > 0) parts.push(`${supplies} поставок создано`)
          const msg = parts.length > 0 ? parts.join(', ') : (d.message || 'Импорт завершён')
          setUploadSuccess(msg)
          if (d.limit_reached && d.subscription_url) {
            setLimitReachedInfo({ message: d.limit_message || 'Достигнут лимит. Оформите подписку для расширения.', url: d.subscription_url })
            setTimeout(() => setLimitReachedInfo(null), 15000)
          } else setLimitReachedInfo(null)
          setTimeout(() => setUploadSuccess(''), 8000)
          setFiles([]); setRecognizeResults([]); setAssignments({}); setColumnMappings({})
          setEntityTree(null)
          setRefreshKey((k) => k + 1)
        } else alert(d.detail || 'Ошибка импорта')
      } else {
        fd.append('assignments', JSON.stringify(assignsList))
        files.forEach((f) => fd.append('files', f))
        const r = await authFetch('/documents/upload-batch', { method: 'POST', body: fd })
        const d = await r.json().catch(() => ({}))
        if (r.ok) {
          setUploadSuccess(`Загружено ${d.uploaded ?? assignsList.length} документов`)
          setTimeout(() => setUploadSuccess(''), 5000)
          setFiles([]); setRecognizeResults([]); setAssignments({})
          setEntityTree(null)
          setRefreshKey((k) => k + 1)
        } else alert(d.detail || 'Ошибка загрузки')
      }
    } catch (e) {
      if (e instanceof TokenRefreshedError) {
        return doUploadRecognize()
      }
      alert(e instanceof Error ? e.message : 'Ошибка сети')
    } finally {
      setUploading(false)
    }
  }, [token, files, tab, recognizeResults, assignments, columnMappings, importCategoryId, importSubcategoryId, importSupplierId, importDeliveryDate, importRowSelection, supplySupplierId, useSupplyDate, supplyDate, supplyItemDecisions])
  const toggleAssignment = (fi: number, entity_type: string, entity_id: number) => {
    setAssignments((prev) => {
      const list = prev[fi] || []
      const exists = list.some((e) => e.entity_type === entity_type && e.entity_id === entity_id)
      const next = exists ? list.filter((e) => !(e.entity_type === entity_type && e.entity_id === entity_id)) : [...list, { entity_type, entity_id }]
      return { ...prev, [fi]: next }
    })
  }
  const isAssigned = (fi: number, entity_type: string, entity_id: number) =>
    (assignments[fi] || []).some((e) => e.entity_type === entity_type && e.entity_id === entity_id)

  const openCreateModal = (fi: number, type: 'nomenclature' | 'supplier', prefill?: Record<string, string>) => {
    setCreateModal({ fileIndex: fi, type, prefill } as any)
    if (type === 'nomenclature' && prefill) {
      setNewNomCode(prefill.code || '')
      setNewNomName(prefill.name || '')
      setNewNomTag(prefill.tag_number || '')
      setNewNomPackage(prefill.package_number || '')
    } else if (type === 'supplier' && prefill) {
      setNewSupplierName(prefill.name || '')
    } else {
      setNewNomCode('')
      setNewNomName('')
      setNewNomTag('')
      setNewNomPackage('')
      setNewSupplierName('')
    }
  }
  const doCreateNomenclature = async () => {
    if (!newNomName.trim() || !token) return
    setCreating(true)
    try {
      const r = await authFetchWithRetry('/entities/nomenclature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newNomCode.trim() || undefined,
          name: newNomName.trim(),
          tag_number: newNomTag.trim() || undefined,
          package_number: newNomPackage.trim() || undefined,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.id && createModal) {
        setAssignments((prev) => ({
          ...prev,
          [createModal.fileIndex]: [...(prev[createModal.fileIndex] || []), { entity_type: 'nomenclature', entity_id: d.id }],
        }))
        setRecognizeResults((prev) =>
          prev.map((f, i) =>
            i === createModal.fileIndex
              ? {
                  ...f,
                  suggested: [
                    ...(f.suggested || []),
                    { entity_type: 'nomenclature', entity_id: d.id, name: d.name, code: d.code || '', match_score: 100, field_label: 'Создано', matched_term: newNomName },
                  ],
                }
              : f
          )
        )
        setCreateModal(null)
        setNewNomCode('')
        setNewNomName('')
        setNewNomTag('')
        setNewNomPackage('')
        setEntityTree(null)
        setRefreshKey((k) => k + 1)
      } else alert(d.detail || 'Ошибка создания')
    } catch { alert('Ошибка сети') }
    finally { setCreating(false) }
  }
  const doCreateSupplier = async () => {
    if (!newSupplierName.trim() || !token) return
    setCreating(true)
    try {
      const r = await authFetchWithRetry('/entities/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.id && createModal) {
        setAssignments((prev) => ({
          ...prev,
          [createModal.fileIndex]: [...(prev[createModal.fileIndex] || []), { entity_type: 'supplier', entity_id: d.id }],
        }))
        setRecognizeResults((prev) =>
          prev.map((f, i) =>
            i === createModal.fileIndex
              ? {
                  ...f,
                  suggested: [
                    ...(f.suggested || []),
                    { entity_type: 'supplier', entity_id: d.id, name: d.name, code: d.inn || '', match_score: 100, field_label: 'Поставщик', matched_term: newSupplierName },
                  ],
                }
              : f
          )
        )
        setImportSupplierId(String(d.id))
        setEntityTree(null)
        setCreateModal(null)
        setNewSupplierName('')
        setRefreshKey((k) => k + 1)
      } else alert(d.detail || 'Ошибка создания')
    } catch { alert('Ошибка сети') }
    finally { setCreating(false) }
  }

  const allNomCount = tab === 'nomenclature' ? total : 0
  const catCount = (c: any) => (c.subcategories || []).reduce((s: number, sub: any) => s + ((sub.nomenclature || []).length), 0)

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Каталог номенклатуры</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Управление номенклатурой и характеристиками</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {ENTITY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: tab === t.key ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: tab === t.key ? 'rgba(14,165,233,0.1)' : 'var(--surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minWidth: 0 }}>
      {tab === 'nomenclature' && (
        <aside style={{
          width: 240,
          flexShrink: 0,
          marginRight: 24,
          padding: 16,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)',
          overflow: 'hidden',
        }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Каталог</div>
            {entityTree ? (
              <>
                <div
                  onClick={() => { setCategoryId(''); setSubcategoryId(''); setSupplierId(''); setManufacturerId('') }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: !categoryId && !subcategoryId && !supplierId && !manufacturerId ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: !categoryId && !subcategoryId && !supplierId && !manufacturerId ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  Вся номенклатура ({allNomCount})
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' }}>Категории</div>
              </>
            ) : entityTreeError ? (
              <div
                onClick={() => fetchEntityTree()}
                style={{ padding: '12px', borderRadius: 8, cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: 'var(--accent)', fontSize: 13 }}
              >
                {entityTreeError}. Нажмите для повтора
              </div>
            ) : (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка каталога…</div>
            )}
          </div>
          {entityTree && (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 8 }}>
              {(entityTree.categories || []).map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => { setCategoryId(String(c.id)); setSubcategoryId(''); setSupplierId(''); setManufacturerId('') }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    background: categoryId === String(c.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: categoryId === String(c.id) ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  {c.name} ({catCount(c)})
                </div>
              ))}
            </div>
          )}
          {entityTree && (
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setSidebarExpandedEntity((e) => (e === 'suppliers' ? null : 'suppliers'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
              >
                {sidebarExpandedEntity === 'suppliers' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Поставщики
              </button>
              {sidebarExpandedEntity === 'suppliers' && (
                <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                  {(entityTree.suppliers || []).map((s: any) => (
                    <div
                      key={s.id}
                      onClick={() => { setSupplierId(String(s.id)); setCategoryId(''); setSubcategoryId(''); setManufacturerId('') }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        background: supplierId === String(s.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                        color: supplierId === String(s.id) ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {s.name}{typeof s.count === 'number' ? ` (${s.count})` : ''}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarExpandedEntity((e) => (e === 'manufacturers' ? null : 'manufacturers'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
              >
                {sidebarExpandedEntity === 'manufacturers' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Производители
              </button>
              {sidebarExpandedEntity === 'manufacturers' && (
                <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                  {(entityTree.manufacturers || []).map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => { setManufacturerId(String(m.id)); setCategoryId(''); setSubcategoryId(''); setSupplierId('') }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        background: manufacturerId === String(m.id) ? 'rgba(14,165,233,0.15)' : 'transparent',
                        color: manufacturerId === String(m.id) ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setSidebarExpandedEntity((e) => (e === 'supplies' ? null : 'supplies'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '8px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
              >
                {sidebarExpandedEntity === 'supplies' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Поставки
              </button>
              {sidebarExpandedEntity === 'supplies' && (
                <div
                  onClick={() => setTab('supplies')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                >
                  Список поставок →
                </div>
              )}
            </div>
          )}
        </aside>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
      {tab === 'supplies' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setManualSupplyOpen((o) => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={20} />
              Создать поставку вручную
            </span>
            {manualSupplyOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {manualSupplyOpen && (
            <div style={{
              padding: 20,
              borderTop: '1px solid var(--border)',
              ...(manualSupplyFullscreen ? { position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', overflow: 'auto' } : {}),
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <strong>Новая поставка</strong>
                <button type="button" onClick={() => setManualSupplyFullscreen((f) => !f)} style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>
                  <Maximize2 size={18} /> {manualSupplyFullscreen ? 'Свернуть' : 'На весь экран'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Поставщик</label>
                  <SearchableSelect
                    options={(entityTree?.suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))}
                    value={manualSupplierId}
                    onChange={setManualSupplierId}
                    placeholder="Поиск в списке…"
                    allowEmpty
                    emptyLabel="— выбрать —"
                    listMaxHeight={180}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <input type="text" placeholder="Новый поставщик" value={manualNewSupplierName} onChange={(e) => setManualNewSupplierName(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }} />
                    <button type="button" disabled={manualCreatingSupplier || !manualNewSupplierName.trim()} onClick={async () => {
                      const name = manualNewSupplierName.trim()
                      if (!name || !token) return
                      setManualCreatingSupplier(true)
                      try {
                        const r = await fetch('/entities/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name }) })
                        const d = await r.json().catch(() => ({}))
                        if (r.ok && d.id) {
                          const tr = await fetch('/api/cabinet/entity-tree', { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.ok ? x.json() : null)
                          if (tr) setEntityTree(tr)
                          setManualSupplierId(String(d.id))
                          setManualNewSupplierName('')
                        } else alert(Array.isArray(d.detail) ? d.detail.map((x: any) => x?.msg || x).join('; ') : (d.detail?.msg ?? d.detail ?? 'Ошибка'))
                      } catch { alert('Ошибка сети') }
                      finally { setManualCreatingSupplier(false) }
                    }} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ Добавить</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Грузоотправитель</label>
                  <SearchableSelect
                    options={(entityTree?.suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))}
                    value={manualConsignorId}
                    onChange={setManualConsignorId}
                    placeholder="Поиск в списке…"
                    allowEmpty
                    emptyLabel="— выбрать —"
                    listMaxHeight={180}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Грузополучатель</label>
                  <SearchableSelect
                    options={(entityTree?.suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))}
                    value={manualConsigneeId}
                    onChange={setManualConsigneeId}
                    placeholder="Поиск в списке…"
                    allowEmpty
                    emptyLabel="— выбрать —"
                    listMaxHeight={180}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Покупатель</label>
                  <SearchableSelect
                    options={(entityTree?.suppliers || []).map((s: any) => ({ id: s.id, name: s.name }))}
                    value={manualBuyerId}
                    onChange={setManualBuyerId}
                    placeholder="Поиск в списке…"
                    allowEmpty
                    emptyLabel="— выбрать —"
                    listMaxHeight={180}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Номер и дата контракта</label>
                  <input type="text" placeholder="№ и дата" value={manualContractNumberDate} onChange={(e) => setManualContractNumberDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Номер и дата спецификации</label>
                  <input type="text" placeholder="№ и дата" value={manualSpecNumberDate} onChange={(e) => setManualSpecNumberDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Номер ТН/Номер ТС</label>
                  <input type="text" placeholder="ТН или ТС" value={manualTnNumber} onChange={(e) => setManualTnNumber(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Номер упаковочного листа</label>
                  <input type="text" placeholder="№" value={manualPackingListNumber} onChange={(e) => setManualPackingListNumber(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>Дата изготовления (необяз.)</label>
                  <input type="date" value={manualProdDate} onChange={(e) => setManualProdDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>Номенклатура (множественный выбор)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
                  <div style={{ flex: '1 1 360px', minWidth: 280 }}>
                    <SearchableSelect
                      options={allNomenclature.map((n) => ({ id: n.id, name: n.code ? `${n.code} — ${n.name}` : n.name }))}
                      value={manualAddNomId}
                      onChange={setManualAddNomId}
                      placeholder="Поиск по названию или коду…"
                      allowEmpty
                      emptyLabel="— выбрать —"
                      listMaxHeight={200}
                      style={{ minWidth: 320 }}
                      onSearchChange={(q) => setManualSupplySearch((s) => ({ ...s, nomenclature: q }))}
                    />
                  </div>
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Кол-во</label>
                    <input type="number" min="0.01" step="0.01" value={manualAddQuantity} onChange={(e) => setManualAddQuantity(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!manualAddNomId) return
                      const n = allNomenclature.find((x) => String(x.id) === manualAddNomId)
                      if (!n) return
                      const key = `${n.id}-${Date.now()}`
                      setManualNomItems((prev) => [...prev, { key, nomenclature_id: n.id, quantity: parseFloat(manualAddQuantity) || 1, name: n.name, code: n.code }])
                      setManualAddNomId('')
                      setManualAddQuantity('1')
                    }}
                    style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}
                  >
                    + Добавить
                  </button>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                    <input type="text" placeholder="Новая номенклатура: название" value={manualNewNomName} onChange={(e) => setManualNewNomName(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, minWidth: 140 }} />
                    <input type="text" placeholder="Код (необяз.)" value={manualNewNomCode} onChange={(e) => setManualNewNomCode(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, width: 100 }} />
                    <button type="button" disabled={manualCreatingNom || !manualNewNomName.trim()} onClick={async () => {
                      const name = manualNewNomName.trim()
                      if (!name || !token) return
                      setManualCreatingNom(true)
                      try {
                        const r = await fetch('/entities/nomenclature', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, code: manualNewNomCode.trim() || null }) })
                        const d = await r.json().catch(() => ({}))
                        if (r.ok && d.id) {
                          const newNom = { id: d.id, name: d.name || name, code: d.code || manualNewNomCode.trim() || null }
                          setAllNomenclature((prev) => [...prev, newNom])
                          const key = `${d.id}-${Date.now()}`
                          setManualNomItems((prev) => [...prev, { key, nomenclature_id: d.id, quantity: parseFloat(manualAddQuantity) || 1, name: newNom.name, code: newNom.code }])
                          setManualNewNomName('')
                          setManualNewNomCode('')
                          setManualAddQuantity('1')
                        } else alert(Array.isArray(d.detail) ? d.detail.map((x: any) => x?.msg || x).join('; ') : (d.detail?.msg ?? d.detail ?? 'Ошибка'))
                      } catch { alert('Ошибка сети') }
                      finally { setManualCreatingNom(false) }
                    }} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ Создать и добавить</button>
                  </div>
                </div>
                {manualNomItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {manualNomItems.map((it) => {
                      const nom = allNomenclature.find((n) => n.id === it.nomenclature_id)
                      const label = nom ? (nom.code ? `${nom.code} — ${nom.name}` : nom.name) : it.name || `ID ${it.nomenclature_id}`
                      return (
                        <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                          <input type="number" min="0.01" step="0.01" value={it.quantity} onChange={(e) => setManualNomItems((prev) => prev.map((x) => x.key === it.key ? { ...x, quantity: parseFloat(e.target.value) || 1 } : x))} style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                          <button type="button" onClick={() => setManualNomItems((prev) => prev.filter((x) => x.key !== it.key))} style={{ padding: 6, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  disabled={manualSupplyCreating || !manualSupplierId || manualNomItems.length === 0}
                  onClick={async () => {
                    const t = localStorage.getItem('access_token')
                    if (!t) return
                    setManualSupplyCreating(true)
                    try {
                      const extra: Record<string, string | number> = {}
                      if (manualConsignorId) extra.consignor_id = parseInt(manualConsignorId, 10)
                      if (manualConsigneeId) extra.consignee_id = parseInt(manualConsigneeId, 10)
                      if (manualBuyerId) extra.buyer_id = parseInt(manualBuyerId, 10)
                      if (manualContractNumberDate?.trim()) extra.contract_number_date = manualContractNumberDate.trim()
                      if (manualSpecNumberDate?.trim()) extra.spec_number_date = manualSpecNumberDate.trim()
                      if (manualTnNumber?.trim()) extra.tn_number = manualTnNumber.trim()
                      if (manualPackingListNumber?.trim()) extra.packing_list_number = manualPackingListNumber.trim()
                      const body = {
                        supplier_id: parseInt(manualSupplierId, 10),
                        production_date: manualProdDate || null,
                        extra_fields: Object.keys(extra).length ? extra : null,
                        items: manualNomItems.map((it) => ({ nomenclature_id: it.nomenclature_id, quantity: it.quantity })),
                      }
                      const r = await fetch('/entities/supplies/batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                        body: JSON.stringify(body),
                      })
                      if (r.ok) {
                        setManualSupplierId('')
                        setManualConsignorId('')
                        setManualConsigneeId('')
                        setManualBuyerId('')
                        setManualContractNumberDate('')
                        setManualSpecNumberDate('')
                        setManualTnNumber('')
                        setManualPackingListNumber('')
                        setManualNomItems([])
                        setManualProdDate('')
                        setManualSupplySearch({ supplier: '', consignor: '', consignee: '', buyer: '', nomenclature: '' })
                        setEntityTree(null)
                        setRefreshKey((k) => k + 1)
                        setManualSupplyOpen(false)
                      } else {
                        const d = await r.json().catch(() => ({}))
                        alert(Array.isArray(d.detail) ? d.detail.map((x: any) => x?.msg || x).join('; ') : (d.detail?.msg ?? (typeof d.detail === 'string' ? d.detail : 'Ошибка создания')))
                      }
                    } catch { alert('Ошибка сети') }
                    finally { setManualSupplyCreating(false) }
                  }}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                >
                  {manualSupplyCreating ? 'Создание...' : 'Создать поставку'}
                </button>
                <button type="button" onClick={() => setManualSupplyOpen(false)} style={{ padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {(tab === 'nomenclature' || tab === 'supplies') && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            marginBottom: '1rem',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setUploadOpen((o) => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Upload size={20} />
              {tab === 'supplies' ? 'Загрузка отгрузочной документации с распознаванием' : 'Загрузка документов с распознаванием'}
            </span>
            {uploadOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {uploadOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
              {uploadSuccess && (
                <div style={{ padding: '12px 0', color: 'var(--success)', fontWeight: 500 }}>✓ {uploadSuccess}</div>
              )}
              {limitReachedInfo && (
                <div style={{ padding: '12px', background: 'var(--warning)', color: 'var(--text)', borderRadius: 8, marginTop: 8 }}>
                  <div style={{ marginBottom: 8 }}>{limitReachedInfo.message}</div>
                  <Link to={limitReachedInfo.url} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Оформить подписку</Link>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 280px', minWidth: 200 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Файлы / папка</label>
                  <div
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 8,
                      padding: 16,
                      textAlign: 'center',
                      background: 'var(--bg)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
                        <Upload size={18} /> Файлы
                        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileInput} style={{ display: 'none' }} />
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer' }}>
                        <FolderOpen size={18} /> Папка
                        <input type="file" multiple {...({ webkitdirectory: '' } as Record<string, unknown>)} onChange={handleFolderInput} style={{ display: 'none' }} />
                      </label>
                      {tab === 'supplies' && (
                        <a
                          href="/api/cabinet/template/supplies"
                          download="шаблон_отгрузочная_ведомость.xlsx"
                          onClick={async (e) => {
                            if (!token) { e.preventDefault(); alert('Войдите в систему'); return }
                            e.preventDefault()
                            try {
                              let r = await fetch('/api/cabinet/template/supplies', { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin' })
                              if (!r.ok) r = await fetch('/documents/template/supplies', { headers: { Authorization: `Bearer ${token}` }, credentials: 'same-origin' })
                              if (!r.ok) throw new Error('Ошибка загрузки')
                              const blob = await r.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'шаблон_отгрузочная_ведомость.xlsx'
                              a.click()
                              URL.revokeObjectURL(url)
                            } catch { alert('Не удалось скачать шаблон') }
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, textDecoration: 'none', cursor: 'pointer' }}
                        >
                          <Download size={18} /> Скачать шаблон
                        </a>
                      )}
                    </div>
                    {files.length > 0 && (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, marginTop: 8, maxHeight: 140, overflow: 'auto' }}>
                        {files.map((f, idx) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface)', borderRadius: 6, marginBottom: 4 }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</span>
                            <button type="button" onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }} title="Удалить"><X size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                  {recognizeResults.length > 0 ? (
                    (() => {
                      const supplyDoc = tab === 'supplies' && recognizeResults[0]?.extracted_structured?.supply_document
                      if (supplyDoc) {
                        const first = recognizeResults[0]
                        const nomItems = first?.extracted_structured?.nomenclature_items || []
                        return (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Поставщик</label>
                                <select
                                  value={supplySupplierId}
                                  onChange={(e) => { setSupplySupplierId(e.target.value); setSupplyContractId('') }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                >
                                  <option value="">— выбрать —</option>
                                  {entityTree?.suppliers?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input type="text" placeholder="ИНН (создать)" value={supplyInnSearch} onChange={(e) => setSupplyInnSearch(e.target.value)} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
                                  <button type="button" disabled={supplyInnCreateLoading} onClick={async () => { const raw = supplyInnSearch.replace(/\D/g, ''); if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return } const t = localStorage.getItem('access_token'); if (!t) return; setSupplyInnCreateLoading(true); try { const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json().catch(() => ({})); if (j.found && j.data) { const dr = await fetch('/entities/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ name: j.data.name || '', phone: j.data.phone, address: j.data.address || j.data.legal_address, inn: j.data.inn }) }); const d = await dr.json().catch(() => ({})); if (dr.ok && d.id) { setEntityTree(null); setSupplySupplierId(String(d.id)); setSupplyInnSearch(''); setRefreshKey((k) => k + 1) } else { alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка создания') } } else { alert('Организация не найдена по ИНН') } } finally { setSupplyInnCreateLoading(false) } }} style={{ padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: supplyInnCreateLoading ? 'not-allowed' : 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>{supplyInnCreateLoading ? '…' : 'Найти и создать'}</button>
                                </div>
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Договор</label>
                                <select
                                  value={supplyContractId}
                                  onChange={(e) => setSupplyContractId(e.target.value)}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                >
                                  <option value="">— выбрать —</option>
                                  {(entityTree?.contracts || []).filter((c: any) => !supplySupplierId || c.supplier_id === parseInt(supplySupplierId, 10)).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Покупатель</label>
                                <input
                                  type="text"
                                  value={supplyBuyerName}
                                  onChange={(e) => setSupplyBuyerName(e.target.value)}
                                  placeholder="ввести вручную"
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                                  <input type="checkbox" checked={useSupplyDate} onChange={(e) => setUseSupplyDate(e.target.checked)} />
                                  <span>Дата поставки</span>
                                </label>
                                {useSupplyDate && (
                                  <input
                                    type="date"
                                    value={supplyDate}
                                    onChange={(e) => setSupplyDate(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                  />
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                              <div style={{ flex: '1 1 280px' }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Адрес отгрузки</label>
                                <input
                                  type="text"
                                  value={supplyShippingAddress}
                                  onChange={(e) => setSupplyShippingAddress(e.target.value)}
                                  placeholder="ввести вручную"
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                              </div>
                              <div style={{ flex: '1 1 280px' }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Адрес доставки</label>
                                <input
                                  type="text"
                                  value={supplyDeliveryAddress}
                                  onChange={(e) => setSupplyDeliveryAddress(e.target.value)}
                                  placeholder="ввести вручную"
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                />
                              </div>
                            </div>
                            <div className="data-list data-list-sticky data-list-recognized" style={{ marginBottom: 16, maxHeight: 280, overflow: 'auto' }}>
                              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Код/Артикул</th>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Наименование</th>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Таговый №</th>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Кол-во</th>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Действие</th>
                                    <th style={{ padding: 8, textAlign: 'left' }}>Выбор</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nomItems.map((it: any, idx: number) => {
                                    const dec = supplyItemDecisions[idx] || { action: 'new' }
                                    const conflict = it.conflict_same_code_diff_tag
                                    const candidates = it.match_candidates || []
                                    return (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: conflict ? 'rgba(239,68,68,0.08)' : candidates.length ? 'rgba(34,197,94,0.06)' : undefined }}>
                                        <td style={{ padding: 8 }}>{it.article || it.code || '—'}</td>
                                        <td style={{ padding: 8 }}>{it.name || '—'}</td>
                                        <td style={{ padding: 8 }}>{it.tag_number || '—'}</td>
                                        <td style={{ padding: 8 }}>{it.quantity ?? 1}</td>
                                        <td style={{ padding: 8 }}>
                                          <select value={candidates.length ? dec.action : 'new'} onChange={(e) => { const v = e.target.value as 'merge'|'new'; setSupplyItemDecisions((p) => ({ ...p, [idx]: { ...p[idx], action: v, nomenclature_id: v === 'merge' ? candidates[0]?.nomenclature_id : undefined } })) }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}>
                                            {candidates.length > 0 && <option value="merge">Объединить</option>}
                                            <option value="new">Добавить новую</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: 8 }}>
                                          {dec.action === 'merge' && (
                                            <select value={dec.nomenclature_id ?? ''} onChange={(e) => setSupplyItemDecisions((p) => ({ ...p, [idx]: { ...p[idx], nomenclature_id: e.target.value ? parseInt(e.target.value, 10) : undefined } }))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, minWidth: 180 }}>
                                              {candidates.map((c: any) => (
                                                <option key={c.nomenclature_id} value={c.nomenclature_id}>{c.name} {c.code ? `(${c.code})` : ''} — {c.match_score}%</option>
                                              ))}
                                            </select>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <button type="button" onClick={doUploadRecognize} disabled={uploading || !supplySupplierId} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{uploading ? 'Импорт...' : 'Завести в базу'}</button>
                          </div>
                        )
                      }
                      const mappingContent = recognizeResults.map((file: any, fi: number) => {
                          const ext = file.extracted_structured as any
                          const header = ext?.header || {}
                          const headerLabels: Record<string, string> = {
                            номер_документа: 'Номер документа (GER)',
                            договор_и_дата: '№ договора и дата',
                            приложение_к_договору: 'Приложение к договору',
                            заказная_спецификация: 'Заказная спецификация',
                            страна_происхождения: 'Страна происхождения',
                            адрес_отгрузки: 'Адрес отгрузки',
                            наименование_проекта: 'Наименование проекта',
                            адрес_поставки: 'Адрес поставки',
                            наименование_поставляемого_изделия: 'Наименование поставляемого изделия',
                            базис_поставки: 'Базис поставки',
                            продавец: 'Продавец',
                            покупатель: 'Покупатель',
                            отправитель: 'Отправитель',
                            грузополучатель: 'Грузополучатель',
                          }
                          const HIDDEN_SUGGESTION_LABELS = ['Номенклатура', 'Номенклатура (код)', 'Номенклатура (наименование)', 'Производитель']
                          const byType = (file.suggested || []).reduce((acc: Record<string, any[]>, s: any) => {
                            const lbl = s.field_label || s.entity_type
                            if (HIDDEN_SUGGESTION_LABELS.includes(lbl)) return acc
                            if (!acc[lbl]) acc[lbl] = []
                            acc[lbl].push(s)
                            return acc
                          }, {})
                          return (
                            <div key={fi} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                              <strong style={{ fontSize: 13 }}>{file.filename}</strong>
                              {(ext?.detected_columns?.length ?? 0) > 0 && (
                                <div style={{ marginTop: 10, width: '100%', minWidth: 0, overflow: 'hidden' }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Сопоставление полей ({ext.detected_columns.length} колонок)</span>
                                  <div style={{ marginTop: 6, maxHeight: 400, overflow: 'auto', fontSize: 12 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                      <thead><tr>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)', width: '28%' }}>Колонка</th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)', width: '18%' }}>Пример</th>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)', width: '54%' }}>Сопоставить с</th>
                                      </tr></thead>
                                      <tbody>
                                      {(ext.detected_columns as any[]).map((col: any, ci: number) => {
                                        const map = columnMappings[fi]?.[col.index] ?? { mapTo: '' }
                                        const customFields = (entityTree?.nomenclature_custom_fields || [])
                                          .filter((k) => !NOMENCLATURE_STANDARD_FIELDS.some((f) => f.v === k))
                                          .map((k) => ({ v: k, lbl: k }))
                                        const sysFields = [...NOMENCLATURE_STANDARD_FIELDS, ...customFields]
                                        return (
                                          <tr key={ci}>
                                            <td style={{ padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={col.name}>{col.name?.slice(0, 60)}{(col.name?.length ?? 0) > 60 ? '…' : ''}</td>
                                            <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', fontSize: 11 }}>{String(col.example || '—').slice(0, 40)}{String(col.example || '').length > 40 ? '…' : ''}</td>
                                            <td style={{ padding: '6px 8px' }}>
                                            <span style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
                                              <select
                                                value={map.mapTo}
                                                onChange={(e) => {
                                                  const v = e.target.value
                                                  setColumnMappings((p) => ({
                                                    ...p,
                                                    [fi]: { ...(p[fi] || {}), [col.index]: { ...(p[fi]?.[col.index] || {}), mapTo: v, newName: v === 'new' ? (col.name || '') : undefined } },
                                                  }))
                                                }}
                                                style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                                              >
                                                {sysFields.map((f) => (
                                                  <option key={f.v} value={f.v}>{f.lbl}</option>
                                                ))}
                                                <option value="new">+ Создать новое свойство</option>
                                              </select>
                                              {map.mapTo === 'new' && (
                                                <input
                                                  type="text"
                                                  value={columnMappings[fi]?.[col.index]?.newName ?? col.name ?? ''}
                                                  onChange={(e) => setColumnMappings((p) => ({
                                                    ...p,
                                                    [fi]: { ...(p[fi] || {}), [col.index]: { ...(p[fi]?.[col.index] || {}), mapTo: 'new', newName: e.target.value } },
                                                  }))}
                                                  placeholder="Название"
                                                  style={{ flex: 1, minWidth: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}
                                                />
                                              )}
                                            </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>При выборе «Создать новое свойство» подставляется распознанное имя колонки</p>
                                </div>
                              )}
                              {Object.keys(header).length > 0 && (
                                <div style={{ marginTop: 10 }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Шапка документа</span>
                                  <div style={{ marginTop: 4, padding: 8, background: 'var(--bg)', borderRadius: 6, fontSize: 12 }}>
                                    {Object.entries(header).map(([k, v]) => (
                                      <div key={k} style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ color: 'var(--text-secondary)', minWidth: 180 }}>{headerLabels[k] || k}:</span>
                                        <span style={{ flex: 1 }}>{String(v).slice(0, 120)}{String(v).length > 120 ? '…' : ''}</span>
                                        {(k === 'продавец' || k === 'отправитель') && (
                                          <button type="button" onClick={() => openCreateModal(fi, 'supplier', { name: String(v).split(',')[0].trim() })} style={{ fontSize: 11, padding: '4px 8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Поставщик</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {file.extracted_preview && !ext && (
                                <div style={{ marginTop: 6, padding: 8, background: 'var(--bg)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', maxHeight: 60, overflow: 'auto' }} title="Пример распознанных данных из файла">
                                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>Из файла: </span>{file.extracted_preview}
                                </div>
                              )}
                              {file.suggested?.length > 0 ? (
                                <div style={{ marginTop: 10 }}>
                                  {Object.entries(byType).map(([fieldLabel, suggestions]) => (
                                    <div key={fieldLabel} style={{ marginBottom: 8 }}>
                                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{fieldLabel}</span>
                                      {(suggestions as Array<{ entity_type: string; entity_id: string | number; matched_term?: string; code?: string; name?: string; match_score?: number }>).map((s) => {
                                        const eid = Number(s.entity_id)
                                        const assigned = isAssigned(fi, s.entity_type, eid)
                                        return (
                                          <label
                                            key={`${s.entity_type}-${s.entity_id}`}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 8,
                                              marginTop: 4,
                                              cursor: 'pointer',
                                              padding: '6px 8px',
                                              borderRadius: 6,
                                              background: assigned ? 'rgba(34,197,94,0.2)' : 'transparent',
                                              border: assigned ? '1px solid rgba(34,197,94,0.5)' : '1px solid transparent',
                                            }}
                                          >
                                            <input type="checkbox" checked={assigned} onChange={() => toggleAssignment(fi, s.entity_type, eid)} />
                                            <span title={s.matched_term ? `Найдено в файле: «${s.matched_term}»` : ''}>
                                              {s.code ? `${s.code} — ${s.name}` : s.name}
                                              {s.matched_term && <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}> ← «{s.matched_term}»</span>}
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({s.match_score}%)</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  ))}
                                  <button type="button" onClick={() => openCreateModal(fi, 'nomenclature')} style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Добавить новую номенклатуру</button>
                                </div>
                              ) : (
                                <div style={{ marginTop: 8 }}>
                                  <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Совпадений не найдено.</p>
                                  <button
                                    type="button"
                                    onClick={() => openCreateModal(fi, 'nomenclature')}
                                    style={{ marginTop: 6, padding: '6px 12px', fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                  >
                                    + Создать новую номенклатуру
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                            <label style={{ fontSize: 14, fontWeight: 600 }}>Распознанные данные и привязка к сущностям</label>
                            <button
                              type="button"
                              onClick={() => setMappingFullscreen(true)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}
                            >
                              <Maximize2 size={16} /> Развернуть на весь экран
                            </button>
                          </div>
                          <div style={{ maxHeight: 'min(70vh, 600px)', overflow: 'auto', fontSize: 13 }}>
                            {mappingContent}
                          </div>
                          {mappingFullscreen && (
                            <div
                              style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9999,
                                background: 'rgba(0,0,0,0.9)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                              }}
                            >
                              <div style={{ flex: 1, overflow: 'auto', padding: 24, fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                                  <span style={{ fontSize: 16, fontWeight: 600 }}>Распознанные данные и привязка к сущностям</span>
                                  <button
                                    type="button"
                                    onClick={() => setMappingFullscreen(false)}
                                    style={{ padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', fontWeight: 500 }}
                                  >
                                    Закрыть
                                  </button>
                                </div>
                                <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
                                  {mappingContent}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Загрузите файлы и нажмите «Распознать»</p>
                  )}
                </div>
              </div>
              {recognizeResults.length > 0 && (() => {
                const hasImportMappingsPreview = recognizeResults.some((f: any, fi: number) => f.extracted_structured?.detected_columns?.length && Object.values(columnMappings[fi] || {}).some((m: any) => m?.mapTo))
                const isNameLikeNewName = (nn: string) => {
                  const n = (nn || '').toLowerCase()
                  return /наименование|название|отгружаемой позиции/.test(n)
                }
                const getRowName = (row: Record<number, string>, map: Record<number, { mapTo: string; newName?: string }>) => {
                  for (const [ci, v] of Object.entries(map || {})) {
                    if (v?.mapTo === 'name' && row[Number(ci)]) return String(row[Number(ci)])
                  }
                  for (const [ci, v] of Object.entries(map || {})) {
                    if (v?.mapTo === 'new' && v?.newName && isNameLikeNewName(v.newName) && row[Number(ci)]) return String(row[Number(ci)])
                  }
                  for (const [ci, v] of Object.entries(map || {})) {
                    if (v?.mapTo === 'tag_number' && row[Number(ci)]) return String(row[Number(ci)])
                  }
                  for (const [ci, v] of Object.entries(map || {})) {
                    if (v?.mapTo === 'code' && row[Number(ci)]) return String(row[Number(ci)])
                  }
                  return '(без названия)'
                }
                const importRowsCount = hasImportMappingsPreview
                  ? recognizeResults.reduce((sum, f: any, fi) => {
                      const sel = importRowSelection[fi]
                      if (!f.extracted_structured?.detected_columns?.length || !Object.values(columnMappings[fi] || {}).some((m: any) => m?.mapTo)) return sum
                      const rows = f.extracted_structured?.rows_data || []
                      return sum + (sel ? sel.size : rows.length)
                    }, 0)
                  : 0
                const assignsCount = recognizeResults.reduce((s, _: any, i) => s + (assignments[i]?.length ?? 0), 0)
                const cat = entityTree?.categories?.find((c: any) => c.id === Number(importCategoryId))
                const subcats = (cat?.subcategories || []).filter((s: any) => s.id > 0)
                return (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {hasImportMappingsPreview && (
                      <>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
                          <div>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Категория</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select value={importCategoryId} onChange={(e) => { setImportCategoryId(e.target.value); setImportSubcategoryId('') }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                                <option value="">— не задана —</option>
                                {entityTree?.categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <button type="button" onClick={async () => {
                                const name = prompt('Название новой категории')
                                if (!name?.trim()) return
                                const r = await authFetchWithRetry('/entities/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
                                if (r.ok) { const d = await r.json(); setEntityTree(null); setImportCategoryId(String(d.id)); setRefreshKey((k) => k + 1) }
                                else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                              }} style={{ fontSize: 11, padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Создать</button>
                            </div>
                          </div>
                          {(subcats.length > 0 || importCategoryId) && (
                            <div>
                              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Подкатегория</label>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select value={importSubcategoryId} onChange={(e) => setImportSubcategoryId(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                                  <option value="">— не задана —</option>
                                  {subcats.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {importCategoryId && (
                                  <button type="button" onClick={async () => {
                                    const name = prompt('Название новой подкатегории')
                                    if (!name?.trim()) return
                                    const r = await authFetchWithRetry('/entities/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category_id: Number(importCategoryId), name: name.trim() }) })
                                    if (r.ok) { const d = await r.json(); setEntityTree(null); setImportSubcategoryId(String(d.id)); setRefreshKey((k) => k + 1) }
                                    else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                                  }} style={{ fontSize: 11, padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Создать</button>
                                )}
                              </div>
                            </div>
                          )}
                          <div style={{ border: importSupplierId ? '1px solid var(--border)' : '2px solid var(--accent)', borderRadius: 8, padding: 12, background: importSupplierId ? 'transparent' : 'rgba(14,165,233,0.08)' }}>
                            <label style={{ fontSize: 12, display: 'block', marginBottom: 6, fontWeight: 600 }}>Поставщик — обязательно для создания поставок</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <select value={importSupplierId || ''} onChange={(e) => setImportSupplierId(e.target.value || '')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', minWidth: 220, fontSize: 13 }}>
                                <option value="">— выберите поставщика —</option>
                                {entityTree?.suppliers?.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                              </select>
                              <button type="button" onClick={async () => {
                                const name = prompt('Название поставщика')
                                if (!name?.trim()) return
                                const r = await authFetchWithRetry('/entities/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
                                if (r.ok) { const d = await r.json(); setEntityTree(null); setImportSupplierId(String(d.id)); setRefreshKey((k) => k + 1) }
                                else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                              }} style={{ fontSize: 11, padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Добавить</button>
                            </div>
                            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input type="text" placeholder="Или по ИНН — найти и создать" value={importInnSearch} onChange={(e) => setImportInnSearch(e.target.value)} style={{ flex: 1, maxWidth: 280, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
                              <button type="button" disabled={importInnCreateLoading} onClick={async () => { const raw = importInnSearch.replace(/\D/g, ''); if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return } const t = localStorage.getItem('access_token'); if (!t) return; setImportInnCreateLoading(true); try { const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json().catch(() => ({})); if (j.found && j.data) { const dr = await authFetchWithRetry('/entities/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: j.data.name || '', phone: j.data.phone, address: j.data.address || j.data.legal_address, inn: j.data.inn }) }); const d = await dr.json().catch(() => ({})); if (dr.ok && d.id) { setEntityTree(null); setImportSupplierId(String(d.id)); setImportInnSearch(''); setRefreshKey((k) => k + 1) } else { alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка создания') } } else { alert('Организация не найдена по ИНН') } } finally { setImportInnCreateLoading(false) } }} style={{ padding: '6px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: importInnCreateLoading ? 'not-allowed' : 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>{importInnCreateLoading ? '…' : 'Найти и создать'}</button>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Дата поставки</label>
                            <input type="date" value={importDeliveryDate} onChange={(e) => setImportDeliveryDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>Сохраняется в создаваемые поставки</span>
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>Список для загрузки ({importRowsCount} позиций)</span>
                        </div>
                        <div style={{ maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
                          {recognizeResults.map((f: any, fi: number) => {
                            const rows = f.extracted_structured?.rows_data || []
                            const map = columnMappings[fi]
                            if (!rows.length || !map) return null
                            return (
                              <div key={fi} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>{f.filename}</div>
                                {rows.map((row: any, ri: number) => {
                                  const sel = importRowSelection[fi]
                                  const checked = !sel || sel.has(ri)
                                  const name = getRowName(row, map)
                                  return (
                                    <label key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setImportRowSelection((p) => {
                                            const next = { ...p }
                                            const s = new Set(next[fi] || [])
                                            if (s.has(ri)) s.delete(ri)
                                            else s.add(ri)
                                            next[fi] = s
                                            return next
                                          })
                                        }}
                                      />
                                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>{name}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                    {importRowsCount > 0 && <p style={{ margin: 0 }}>Будет создано позиций номенклатуры: <strong style={{ color: 'var(--text)' }}>{importRowsCount}</strong></p>}
                    {assignsCount > 0 && !hasImportMappingsPreview && <p style={{ margin: 0 }}>Будет привязано документов: <strong style={{ color: 'var(--text)' }}>{assignsCount}</strong></p>}
                  </div>
                )
              })()}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={runRecognize}
                  disabled={uploading || files.length === 0}
                  style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  Распознать
                </button>
                {recognizeResults.length > 0 && (
                  <button
                    type="button"
                    onClick={doUploadRecognize}
                    disabled={uploading}
                    style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}
                  >
                    Загрузить выбранные
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setFiles([]); setRecognizeResults([]); setAssignments({}); setColumnMappings({}); setUploadSuccess(''); setLimitReachedInfo(null) }}
                  style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
                >
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'nomenclature' && entityTree && (
        <div className="nom-entity-filters" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '0.75rem' }}>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">Поставщик</option>
            {entityTree.suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
          <select
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">Производитель</option>
            {entityTree.manufacturers.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">Категория</option>
            {entityTree.categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="">Подкатегория</option>
            {categoryId && entityTree.categories.find((c) => String(c.id) === categoryId)?.subcategories?.filter((s) => s.id > 0).map((s) => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      {(tab === 'categories' || tab === 'subcategories' || tab === 'suppliers' || tab === 'manufacturers' || tab === 'customers') && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'categories' && (
            <button
              type="button"
              onClick={() => { setCreateCategoryOpen(true); setCreateCategoryName('') }}
              style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
            >
              <Plus size={18} />
              Создать категорию
            </button>
          )}
          {tab === 'subcategories' && (
            <button
              type="button"
              onClick={() => { setCreateSubcategoryOpen(true); setCreateSubcategoryCategoryId(''); setCreateSubcategoryName('') }}
              disabled={!entityTree}
              style={{ padding: '10px 18px', background: entityTree ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 8, cursor: entityTree ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
            >
              <Plus size={18} />
              Создать подкатегорию
            </button>
          )}
          {tab === 'suppliers' && (
            <button
              type="button"
              onClick={() => { setCreateSupplierOpen(true); setCreateSupplierName(''); setCreateSupplierPhone(''); setCreateSupplierAddress(''); setCreateSupplierInn(''); setCreateSupplierFile(null) }}
              style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
            >
              <Plus size={18} />
              Добавить поставщика
            </button>
          )}
          {tab === 'manufacturers' && (
            <button
              type="button"
              onClick={() => { setCreateManufacturerOpen(true); setCreateManufacturerName(''); setCreateManufacturerAddress(''); setCreateManufacturerFile(null) }}
              style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
            >
              <Plus size={18} />
              Добавить производителя
            </button>
          )}
          {tab === 'customers' && (
            <button
              type="button"
              onClick={() => { setCreateCustomerOpen(true); setCreateCustomerName('') }}
              style={{ padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
            >
              <Plus size={18} />
              Добавить заказчика
            </button>
          )}
        </div>
      )}
      {(tab === 'nomenclature' || tab === 'suppliers' || tab === 'manufacturers' || tab === 'customers' || tab === 'categories' || tab === 'subcategories' || tab === 'supplies') && (
        <div className="table-toolbar" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <input
              type="search"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                width: 'min(280px, 100%)',
                minWidth: 0,
              }}
            />
            {tab === 'subcategories' && entityTree && (
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">Категория</option>
                {entityTree.categories?.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            )}
            {tab === 'supplies' && entityTree && (
              <select
                value={filterSupplierId}
                onChange={(e) => setFilterSupplierId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">Поставщик</option>
                {entityTree.suppliers?.map((s: any) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            )}
            {tab === 'nomenclature' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">Сортировка: по умолчанию</option>
                <option value="name">По наименованию</option>
                <option value="code">По коду</option>
                <option value="tag_number">По таговому №</option>
                <option value="package_number">По № груз. места</option>
              </select>
            )}
            {(tab === 'categories' || tab === 'subcategories') && (
              <select
                value={sortBy || 'name'}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="name">По наименованию</option>
                <option value="id">По ID</option>
              </select>
            )}
            {tab === 'supplies' && (
              <select
                value={sortBy || 'created_at'}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="created_at">По дате</option>
                <option value="id">По ID</option>
                <option value="quantity">По количеству</option>
                <option value="manufacturer">По производителю</option>
                <option value="category">По категории</option>
                <option value="subcategory">По подкатегории</option>
              </select>
            )}
            {((tab === 'nomenclature' && sortBy) || tab === 'suppliers' || tab === 'manufacturers' || tab === 'customers' || tab === 'categories' || tab === 'subcategories' || tab === 'supplies') && (
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
              >
                {sortOrder === 'asc' ? '↑ По возрастанию' : '↓ По убыванию'}
              </button>
            )}
          </div>
          {tab === 'nomenclature' && (
            <button
              type="button"
              onClick={() => setNomColumnsModalOpen(true)}
              title="Настройка колонок"
              style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}
            >
              <Settings2 size={18} />
            </button>
          )}
          {tab === 'supplies' && (
            <button
              type="button"
              onClick={() => setSupplyColumnsModalOpen(true)}
              title="Настройка колонок"
              style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}
            >
              <Settings2 size={18} />
            </button>
          )}
        </div>
      )}
      {tab === 'nomenclature' && selectedNomIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'rgba(14,165,233,0.15)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600 }}>Выбрано: {selectedNomIds.size}</span>
          {canDelete && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Удалить выбранные ${selectedNomIds.size} позиций безвозвратно?`)) return
                const t = localStorage.getItem('access_token')
                let failed = 0
                const deletedIds = new Set<number>()
                for (const id of selectedNomIds) {
                  const r = await fetch(`/entities/nomenclature/${id}?soft=false`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${t}` },
                  })
                  if (r.ok) {
                    deletedIds.add(id)
                  } else {
                    failed++
                    if (failed === 1) {
                      const err = await r.json().catch(() => ({}))
                      const msg = typeof err.detail === 'string' ? err.detail : Array.isArray(err.detail) ? err.detail.map((x: any) => x?.msg || x?.loc?.join('.') || JSON.stringify(x)).join('; ') : err.message || r.statusText || 'Ошибка удаления'
                      alert(msg)
                    }
                  }
                }
                setSelectedNomIds((prev) => new Set([...prev].filter((x) => !deletedIds.has(x))))
                setEntityTree(null)
                setRefreshKey((k) => k + 1)
              }}
              style={{ padding: '6px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={() => { setLinkModal('category'); setLinkSelectedId('') }}
            style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
          >
            Подвязать к категории
          </button>
          <button
            type="button"
            onClick={() => { setLinkModal('supplier'); setLinkSelectedId('') }}
            style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
          >
            Подвязать к поставщику
          </button>
          <button
            type="button"
            onClick={() => { setLinkModal('manufacturer'); setLinkSelectedId('') }}
            style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
          >
            Подвязать к производителю
          </button>
          <button
            type="button"
            onClick={() => setSelectedNomIds(new Set())}
            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'auto' }}
          >
            Снять выделение
          </button>
        </div>
      )}
      {tab === 'supplies' && selectedSupplyIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'rgba(14,165,233,0.15)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600 }}>Выбрано поставок: {selectedSupplyIds.size}</span>
          {canDelete && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(`Удалить выбранные ${selectedSupplyIds.size} поставок?`)) return
                const t = localStorage.getItem('access_token')
                let failed = 0
                const deletedIds = new Set<number>()
                for (const id of selectedSupplyIds) {
                  const r = await fetch(`/entities/supplies/${id}?soft=true`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${t}` },
                  })
                  if (r.ok) deletedIds.add(id)
                  else {
                    failed++
                    if (failed === 1) {
                      const err = await r.json().catch(() => ({}))
                      const msg = typeof err.detail === 'string' ? err.detail : Array.isArray(err.detail) ? err.detail.map((x: any) => x?.msg || x?.loc?.join('.') || JSON.stringify(x)).join('; ') : err.message || r.statusText || 'Ошибка удаления'
                      alert(msg)
                    }
                  }
                }
                setSelectedSupplyIds((prev) => new Set([...prev].filter((x) => !deletedIds.has(x))))
                setEntityTree(null)
                setRefreshKey((k) => k + 1)
              }}
              style={{ padding: '6px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedSupplyIds(new Set())}
            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'auto' }}
          >
            Снять выделение
          </button>
        </div>
      )}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : (
        <div className="data-list data-list-sticky" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                {tab === 'nomenclature' && (
                  <>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((r: any) => selectedNomIds.has(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNomIds(new Set(items.map((r: any) => r.id)))
                          else setSelectedNomIds(new Set())
                        }}
                        title="Выбрать все"
                      />
                    </th>
                    {NOMENCLATURE_TABLE_COLUMNS.filter((c) => nomColumnVisibility[c.key] !== false).map((c) => {
                      const sk = (c as { sortKey?: string }).sortKey
                      return (
                        <th
                          key={c.key}
                          onClick={sk ? () => { setSortBy(sk); setSortOrder((o) => (sortBy === sk && o === 'asc' ? 'desc' : 'asc')) } : undefined}
                          style={sk ? { cursor: 'pointer', userSelect: 'none' } : {}}
                          title={sk ? 'Сортировка' : undefined}
                        >
                          {c.label}
                          {sk && sortBy === sk && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </th>
                      )
                    })}
                  </>
                )}
                {tab === 'suppliers' && (
                  <>
                    <th>Название</th>
                    <th>Телефон</th>
                    <th>Адрес</th>
                  </>
                )}
                {tab === 'manufacturers' && (
                  <>
                    <th>Название</th>
                    <th>Адрес</th>
                  </>
                )}
                {tab === 'customers' && (
                  <>
                    <th>Название</th>
                    <th>ИНН</th>
                    <th>Адрес</th>
                    <th>Телефон</th>
                  </>
                )}
                {tab === 'supplies' && (
                  <>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((r: any) => selectedSupplyIds.has(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSupplyIds(new Set(items.map((r: any) => r.id)))
                          else setSelectedSupplyIds(new Set())
                        }}
                        title="Выбрать все"
                      />
                    </th>
                    {SUPPLY_TABLE_COLUMNS.filter((c) => supplyColumnVisibility[c.key] !== false).map((c) => (
                      <th
                        key={c.key}
                        onClick={c.sortKey ? () => { setSortBy(c.sortKey!); setSortOrder((o) => (sortBy === c.sortKey && o === 'asc' ? 'desc' : 'asc')) } : undefined}
                        style={{ cursor: c.sortKey ? 'pointer' : undefined, userSelect: 'none' }}
                        title={c.sortKey ? 'Сортировка' : undefined}
                      >
                        {c.label}
                        {c.sortKey && sortBy === c.sortKey && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                    ))}
                  </>
                )}
                {tab === 'categories' && <th>Название</th>}
                {tab === 'subcategories' && (
                  <>
                    <th>Категория</th>
                    <th>Название</th>
                  </>
                )}
                <th style={{ width: 120, minWidth: 120, position: 'sticky', right: 0, background: 'var(--bg-secondary)', zIndex: 2, boxShadow: '-4px 0 8px rgba(0,0,0,0.12)' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row: any) => (
                <tr key={row.id}>
                  {tab === 'nomenclature' && (
                    <>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedNomIds.has(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedNomIds((s) => new Set([...s, row.id]))
                            else setSelectedNomIds((s) => { const n = new Set(s); n.delete(row.id); return n })
                          }}
                        />
                      </td>
                      {NOMENCLATURE_TABLE_COLUMNS.filter((c) => nomColumnVisibility[c.key] !== false).map((c) => {
                        const val = ['code', 'name', 'tag_number', 'package_number'].includes(c.key)
                          ? row[c.key]
                          : c.key === 'quantity'
                            ? (row.total_quantity != null ? row.total_quantity : row.extra_fields?.[c.key])
                            : row.extra_fields?.[c.key]
                        const display = val != null && val !== '' ? String(val) : '—'
                        const isLink = c.key === 'code' || c.key === 'name'
                        return (
                          <td key={c.key}>
                            {isLink ? (
                              <Link to={`/cabinet/entities/nomenclature/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                {display}
                              </Link>
                            ) : (
                              display
                            )}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {tab === 'suppliers' && (
                    <>
                      <td>
                        <Link to={`/cabinet/entities/supplier/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.name}</Link>
                      </td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.address || '—'}</td>
                    </>
                  )}
                  {tab === 'manufacturers' && (
                    <>
                      <td>
                        <Link to={`/cabinet/entities/manufacturer/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.name}</Link>
                      </td>
                      <td>{row.address || '—'}</td>
                    </>
                  )}
                  {tab === 'customers' && (
                    <>
                      <td>
                        <Link to={`/cabinet/entities/customer/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.name}</Link>
                      </td>
                      <td>{row.inn || '—'}</td>
                      <td>{row.address || '—'}</td>
                      <td>{row.phone || '—'}</td>
                    </>
                  )}
                  {tab === 'supplies' && (
                    <>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedSupplyIds.has(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSupplyIds((s) => new Set([...s, row.id]))
                            else setSelectedSupplyIds((s) => { const n = new Set(s); n.delete(row.id); return n })
                          }}
                        />
                      </td>
                      {SUPPLY_TABLE_COLUMNS.filter((c) => supplyColumnVisibility[c.key] !== false).map((c) => {
                        if (c.key === 'id') return <td key={c.key}><Link to={`/cabinet/entities/supply/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.id}</Link></td>
                        if (c.key === 'supplier_name') return <td key={c.key}>{entityTree && row.supplier_id ? (() => { const sup = entityTree.suppliers?.find((s: any) => s.id === row.supplier_id); return sup ? <Link to={`/cabinet/entities/supplier/${sup.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{sup.name}</Link> : row.supplier_id })() : (row.supplier_name || '—')}</td>
                        if (c.key === 'nomenclature_name') return <td key={c.key}>{row.nomenclature_id ? <Link to={`/cabinet/entities/nomenclature/${row.nomenclature_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.nomenclature_name || row.nomenclature_id}</Link> : '—'}</td>
                        if (c.key === 'quantity') return <td key={c.key}><Link to={`/cabinet/entities/supply/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.quantity}</Link></td>
                        return <td key={c.key}>{row[c.key] || '—'}</td>
                      })}
                    </>
                  )}
                  {tab === 'categories' && (
                    <td>
                      <Link to={`/cabinet/entities/category/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.name}</Link>
                    </td>
                  )}
                  {tab === 'subcategories' && (
                    <>
                      <td>
                        {entityTree ? (() => {
                          const cat = entityTree.categories?.find((c: any) => c.id === row.category_id)
                          return cat ? <Link to={`/cabinet/entities/category/${cat.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{cat.name}</Link> : row.category_id
                        })() : row.category_id}
                      </td>
                      <td>
                        <Link to={`/cabinet/entities/subcategory/${row.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{row.name}</Link>
                      </td>
                    </>
                  )}
                  <td style={{ width: 120, minWidth: 120, whiteSpace: 'nowrap', position: 'sticky', right: 0, background: 'var(--bg-secondary)', zIndex: 1, boxShadow: '-4px 0 8px rgba(0,0,0,0.08)' }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    {(() => {
                      const entityType = tab === 'subcategories' ? 'subcategory' : tab === 'categories' ? 'category' : tab === 'suppliers' ? 'supplier' : tab === 'manufacturers' ? 'manufacturer' : tab === 'customers' ? 'customer' : tab === 'supplies' ? 'supply' : 'nomenclature'
                      const qrUrl = tab === 'nomenclature' && row.code
                        ? `${baseUrl}/scan/entity/nomenclature/by-code/${encodeURIComponent(row.code)}`
                        : `${baseUrl}/scan/entity/${entityType}/${row.id}`
                      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`
                      const token = localStorage.getItem('access_token')
                      const doDisable = async () => {
                        if (!confirm('Отключить номенклатуру? (скрыть из активных)')) return
                        const r = await fetch(`/entities/nomenclature/${row.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ is_deleted: true }),
                        })
                        if (r.ok) { setEntityTree(null); setRefreshKey((k) => k + 1) }
                        else alert((await r.json().catch(() => ({}))).detail || 'Ошибка')
                      }
                      const doDelete = async () => {
                        if (!confirm('Удалить номенклатуру безвозвратно?')) return
                        const r = await fetch(`/entities/nomenclature/${row.id}?soft=false`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        })
                        if (r.ok) {
                          setEntityTree(null)
                          setRefreshKey((k) => k + 1)
                        } else {
                          const err = await r.json().catch(() => ({}))
                          const msg = typeof err.detail === 'string' ? err.detail : (Array.isArray(err.detail) ? err.detail.map((x: any) => x?.msg || String(x)).join('; ') : 'Ошибка удаления')
                          alert(msg)
                          if (r.status === 404) { setEntityTree(null); setRefreshKey((k) => k + 1) } // обновить список, если уже удалено
                        }
                      }
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setQrModal({ url: qrImageUrl, code: row.code, id: row.id })}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}
                            title="Показать QR-код"
                          >
                            <QrCode size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await fetch(qrImageUrl)
                              const blob = await r.blob()
                              const a = document.createElement('a')
                              a.href = URL.createObjectURL(blob)
                              a.download = `qr-${row.code || row.id}.png`
                              a.click()
                              URL.revokeObjectURL(a.href)
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}
                            title="Скачать QR-код"
                          >
                            <Download size={18} />
                          </button>
                          {tab === 'nomenclature' && canDelete && !row.is_deleted && (
                            <>
                              <button
                                type="button"
                                onClick={doDisable}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                                title="Отключить"
                              >
                                <Ban size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={doDelete}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}
                                title="Удалить"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                          {tab === 'supplies' && canDelete && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Удалить поставку?')) return
                                const r = await fetch(`/entities/supplies/${row.id}?soft=true`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                if (r.ok) {
                                  setSelectedSupplyIds((s) => { const n = new Set(s); n.delete(row.id); return n })
                                  setEntityTree(null)
                                  setRefreshKey((k) => k + 1)
                                } else {
                                  const err = await r.json().catch(() => ({}))
                                  alert(typeof err.detail === 'string' ? err.detail : 'Ошибка удаления')
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}
                              title="Удалить"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </>
                      )
                    })()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p style={{ padding: 24, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Нет данных. Запустите <code>python3 scripts/seed_demo.py</code> для демо-данных.
            </p>
          )}
        </div>
      )}
      {hasLimit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {total === 0 ? 'Нет записей' : `Показано ${offset + 1}–${Math.min(offset + limit, total)} из ${total}`}
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              title="Строк на странице"
            >
              {LIMIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: offset <= 0 ? 'not-allowed' : 'pointer', opacity: offset <= 0 ? 0.5 : 1 }}
            >
              ← Назад
            </button>
            <button
              type="button"
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => Math.min(o + limit, total - 1))}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: offset + limit >= total ? 'not-allowed' : 'pointer', opacity: offset + limit >= total ? 0.5 : 1 }}
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}

      {qrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setQrModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>QR-код</h3>
            <img src={qrModal.url} alt="QR" style={{ width: 200, height: 200, background: '#fff', padding: 8, borderRadius: 8 }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={async () => {
                  try {
                    const r = await fetch(qrModal.url)
                    const blob = await r.blob()
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `qr-${qrModal.code || qrModal.id}.png`
                    a.click()
                    URL.revokeObjectURL(a.href)
                  } catch {
                    window.open(qrModal.url, '_blank')
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                <Download size={18} /> Скачать QR
              </button>
              <button
                onClick={() => setQrModal(null)}
                style={{ padding: '10px 20px', background: 'var(--border)', color: 'var(--text)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {createCategoryOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !createCategoryLoading && setCreateCategoryOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>Создать категорию</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
              <input
                type="text"
                value={createCategoryName}
                onChange={(e) => setCreateCategoryName(e.target.value)}
                placeholder="Название категории"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !createCategoryLoading && setCreateCategoryOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!createCategoryName.trim() || createCategoryLoading) return
                  setCreateCategoryLoading(true)
                  try {
                    const r = await fetch('/entities/categories', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ name: createCategoryName.trim() }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok) {
                      setEntityTree(null)
                      setCreateCategoryOpen(false)
                      setCreateCategoryName('')
                      setRefreshKey((k) => k + 1)
                    } else {
                      alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка')
                    }
                  } finally {
                    setCreateCategoryLoading(false)
                  }
                }}
                disabled={createCategoryLoading || !createCategoryName.trim()}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createCategoryLoading ? 'not-allowed' : 'pointer' }}
              >
                {createCategoryLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createSupplierOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !createSupplierLoading && setCreateSupplierOpen(false)}
        >
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', minWidth: 380, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Добавить поставщика</h3>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск по ИНН</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="10 или 12 цифр" value={createSupplierInn} onChange={(e) => setCreateSupplierInn(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <button type="button" onClick={async () => { const raw = createSupplierInn.replace(/\D/g, ''); if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return } const t = localStorage.getItem('access_token'); if (!t) return; setCreateSupplierInnLookupLoading(true); try { const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json().catch(() => ({})); if (j.found && j.data) { setCreateSupplierName(j.data.name || ''); setCreateSupplierPhone(j.data.phone || ''); setCreateSupplierAddress(j.data.address || j.data.legal_address || ''); setCreateSupplierInn(j.data.inn || raw); } else { alert('Организация не найдена по ИНН. Введите данные вручную.'); } } finally { setCreateSupplierInnLookupLoading(false) } }} disabled={createSupplierInnLookupLoading} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createSupplierInnLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>{createSupplierInnLookupLoading ? '…' : 'Найти'}</button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
              <input type="text" value={createSupplierName} onChange={(e) => setCreateSupplierName(e.target.value)} placeholder="ООО «Название»" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Телефон</label>
              <input type="text" value={createSupplierPhone} onChange={(e) => setCreateSupplierPhone(e.target.value)} placeholder="+7..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Адрес</label>
              <input type="text" value={createSupplierAddress} onChange={(e) => setCreateSupplierAddress(e.target.value)} placeholder="Адрес" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>ИНН</label>
              <input type="text" value={createSupplierInn} onChange={(e) => setCreateSupplierInn(e.target.value)} placeholder="ИНН" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Карточка компании (PDF, Word, JPEG, PNG)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
                onChange={(e) => setCreateSupplierFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
              />
              {createSupplierFile && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>{createSupplierFile.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !createSupplierLoading && setCreateSupplierOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!createSupplierName.trim() || createSupplierLoading) return
                  setCreateSupplierLoading(true)
                  try {
                    const r = await fetch('/entities/suppliers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        name: createSupplierName.trim(),
                        phone: createSupplierPhone.trim() || undefined,
                        address: createSupplierAddress.trim() || undefined,
                        inn: createSupplierInn.trim() || undefined,
                      }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok && d.id) {
                      if (createSupplierFile) {
                        const fd = new FormData()
                        fd.append('files', createSupplierFile)
                        fd.append('entity_type', 'supplier')
                        fd.append('entity_id', String(d.id))
                        await fetch('/documents/upload-batch', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                      }
                      setEntityTree(null)
                      setCreateSupplierOpen(false)
                      setCreateSupplierName('')
                      setCreateSupplierPhone('')
                      setCreateSupplierAddress('')
                      setCreateSupplierInn('')
                      setCreateSupplierFile(null)
                      setRefreshKey((k) => k + 1)
                    } else {
                      alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка')
                    }
                  } finally { setCreateSupplierLoading(false) }
                }}
                disabled={createSupplierLoading || !createSupplierName.trim()}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createSupplierLoading ? 'not-allowed' : 'pointer' }}
              >
                {createSupplierLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createManufacturerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !createManufacturerLoading && setCreateManufacturerOpen(false)}
        >
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', minWidth: 380, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Добавить производителя</h3>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск по ИНН</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="10 или 12 цифр" value={createManufacturerInn} onChange={(e) => setCreateManufacturerInn(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <button type="button" onClick={async () => { const raw = createManufacturerInn.replace(/\D/g, ''); if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return } const t = localStorage.getItem('access_token'); if (!t) return; setCreateManufacturerInnLookupLoading(true); try { const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json().catch(() => ({})); if (j.found && j.data) { setCreateManufacturerName(j.data.name || ''); setCreateManufacturerAddress(j.data.address || j.data.legal_address || ''); setCreateManufacturerInn(j.data.inn || raw); } else { alert('Организация не найдена по ИНН. Введите данные вручную.'); } } finally { setCreateManufacturerInnLookupLoading(false) } }} disabled={createManufacturerInnLookupLoading} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createManufacturerInnLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>{createManufacturerInnLookupLoading ? '…' : 'Найти'}</button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
              <input type="text" value={createManufacturerName} onChange={(e) => setCreateManufacturerName(e.target.value)} placeholder="ООО «Название»" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Адрес</label>
              <input type="text" value={createManufacturerAddress} onChange={(e) => setCreateManufacturerAddress(e.target.value)} placeholder="Адрес" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>ИНН</label>
              <input type="text" value={createManufacturerInn} onChange={(e) => setCreateManufacturerInn(e.target.value)} placeholder="ИНН" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Карточка компании (PDF, Word, JPEG, PNG)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpeg,.jpg,.png"
                onChange={(e) => setCreateManufacturerFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
              />
              {createManufacturerFile && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>{createManufacturerFile.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !createManufacturerLoading && setCreateManufacturerOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!createManufacturerName.trim() || createManufacturerLoading) return
                  setCreateManufacturerLoading(true)
                  try {
                    const r = await fetch('/entities/manufacturers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        name: createManufacturerName.trim(),
                        address: createManufacturerAddress.trim() || undefined,
                        inn: createManufacturerInn.trim() || undefined,
                      }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok && d.id) {
                      if (createManufacturerFile) {
                        const fd = new FormData()
                        fd.append('files', createManufacturerFile)
                        fd.append('entity_type', 'manufacturer')
                        fd.append('entity_id', String(d.id))
                        await fetch('/documents/upload-batch', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                      }
                      setEntityTree(null)
                      setCreateManufacturerOpen(false)
                      setCreateManufacturerName('')
                      setCreateManufacturerAddress('')
                      setCreateManufacturerInn('')
                      setCreateManufacturerFile(null)
                      setRefreshKey((k) => k + 1)
                    } else {
                      alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка')
                    }
                  } finally { setCreateManufacturerLoading(false) }
                }}
                disabled={createManufacturerLoading || !createManufacturerName.trim()}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createManufacturerLoading ? 'not-allowed' : 'pointer' }}
              >
                {createManufacturerLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createCustomerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !createCustomerLoading && setCreateCustomerOpen(false)}>
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', minWidth: 380, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Добавить заказчика</h3>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск по ИНН</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" placeholder="10 или 12 цифр" value={createCustomerInn} onChange={(e) => setCreateCustomerInn(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <button type="button" onClick={async () => { const raw = createCustomerInn.replace(/\D/g, ''); if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return } const t = localStorage.getItem('access_token'); if (!t) return; setCreateCustomerInnLookupLoading(true); try { const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } }); const j = await r.json().catch(() => ({})); if (j.found && j.data) { setCreateCustomerName(j.data.name || ''); setCreateCustomerInn(j.data.inn || raw); setCreateCustomerAddress(j.data.address || j.data.legal_address || ''); setCreateCustomerPhone(j.data.phone || ''); } else { alert('Организация не найдена по ИНН. Введите данные вручную.'); } } finally { setCreateCustomerInnLookupLoading(false) } }} disabled={createCustomerInnLookupLoading} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createCustomerInnLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>{createCustomerInnLookupLoading ? '…' : 'Найти'}</button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
              <input type="text" value={createCustomerName} onChange={(e) => setCreateCustomerName(e.target.value)} placeholder="ООО «Название»" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>ИНН</label>
              <input type="text" value={createCustomerInn} onChange={(e) => setCreateCustomerInn(e.target.value)} placeholder="ИНН" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Адрес</label>
              <input type="text" value={createCustomerAddress} onChange={(e) => setCreateCustomerAddress(e.target.value)} placeholder="Адрес" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Телефон</label>
              <input type="text" value={createCustomerPhone} onChange={(e) => setCreateCustomerPhone(e.target.value)} placeholder="+7..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !createCustomerLoading && setCreateCustomerOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!createCustomerName.trim() || createCustomerLoading) return
                  setCreateCustomerLoading(true)
                  try {
                    const r = await fetch('/entities/customers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        name: createCustomerName.trim(),
                        inn: createCustomerInn.trim() || undefined,
                        address: createCustomerAddress.trim() || undefined,
                        phone: createCustomerPhone.trim() || undefined,
                      }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok && d.id) {
                      setEntityTree(null)
                      setCreateCustomerOpen(false)
                      setCreateCustomerName('')
                      setCreateCustomerInn('')
                      setCreateCustomerAddress('')
                      setCreateCustomerPhone('')
                      setRefreshKey((k) => k + 1)
                    } else {
                      alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка')
                    }
                  } finally { setCreateCustomerLoading(false) }
                }}
                disabled={createCustomerLoading || !createCustomerName.trim()}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createCustomerLoading ? 'not-allowed' : 'pointer' }}
              >
                {createCustomerLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createSubcategoryOpen && entityTree && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !createSubcategoryLoading && setCreateSubcategoryOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>Создать подкатегорию</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Корневая категория *</label>
              <select
                value={createSubcategoryCategoryId}
                onChange={(e) => setCreateSubcategoryCategoryId(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">— выбрать категорию —</option>
                {entityTree.categories?.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
              <input
                type="text"
                value={createSubcategoryName}
                onChange={(e) => setCreateSubcategoryName(e.target.value)}
                placeholder="Название подкатегории"
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !createSubcategoryLoading && setCreateSubcategoryOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!createSubcategoryName.trim() || !createSubcategoryCategoryId || createSubcategoryLoading) return
                  setCreateSubcategoryLoading(true)
                  try {
                    const r = await fetch('/entities/subcategories', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ category_id: Number(createSubcategoryCategoryId), name: createSubcategoryName.trim() }),
                    })
                    const d = await r.json().catch(() => ({}))
                    if (r.ok) {
                      setEntityTree(null)
                      setCreateSubcategoryOpen(false)
                      setCreateSubcategoryCategoryId('')
                      setCreateSubcategoryName('')
                      setRefreshKey((k) => k + 1)
                    } else {
                      alert(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail) || 'Ошибка')
                    }
                  } finally {
                    setCreateSubcategoryLoading(false)
                  }
                }}
                disabled={createSubcategoryLoading || !createSubcategoryName.trim() || !createSubcategoryCategoryId}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: createSubcategoryLoading ? 'not-allowed' : 'pointer' }}
              >
                {createSubcategoryLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !creating && setCreateModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {createModal.type === 'supplier' ? (
              <>
                <h3 style={{ marginBottom: 16 }}>Создать поставщика</h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Название *</label>
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="ООО «Название»"
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => !creating && setCreateModal(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
                  <button onClick={doCreateSupplier} disabled={creating || !newSupplierName.trim()} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: creating ? 'not-allowed' : 'pointer' }}>{creating ? 'Создание...' : 'Создать'}</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 16 }}>Создать номенклатуру</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Код / Артикул</label>
                  <input
                    type="text"
                    value={newNomCode}
                    onChange={(e) => setNewNomCode(e.target.value)}
                    placeholder="Необязательно"
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Таговый номер</label>
                  <input
                    type="text"
                    value={newNomTag}
                    onChange={(e) => setNewNomTag(e.target.value)}
                    placeholder="Необязательно"
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Номер грузового места</label>
                  <input
                    type="text"
                    value={newNomPackage}
                    onChange={(e) => setNewNomPackage(e.target.value)}
                    placeholder="Необязательно"
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Наименование *</label>
                  <input
                    type="text"
                    value={newNomName}
                    onChange={(e) => setNewNomName(e.target.value)}
                    placeholder="Обязательно"
                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => !creating && setCreateModal(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
                  <button onClick={doCreateNomenclature} disabled={creating || !newNomName.trim()} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: creating ? 'not-allowed' : 'pointer' }}>{creating ? 'Создание...' : 'Создать'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {nomColumnsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setNomColumnsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>Отображение колонок</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Поиск учитывает все поля, даже скрытые</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {NOMENCLATURE_TABLE_COLUMNS.map((c) => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={nomColumnVisibility[c.key] !== false}
                    onChange={() => {
                      const next = { ...nomColumnVisibility, [c.key]: !(nomColumnVisibility[c.key] !== false) }
                      setNomColumnVisibility(next)
                      try {
                        localStorage.setItem('ikamdocs_nom_columns', JSON.stringify(next))
                      } catch (_) {}
                    }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setNomColumnsModalOpen(false)} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Готово</button>
            </div>
          </div>
        </div>
      )}

      {supplyColumnsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSupplyColumnsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>Отображение колонок поставок</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {SUPPLY_TABLE_COLUMNS.map((c) => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supplyColumnVisibility[c.key] !== false}
                    onChange={() => {
                      const next = { ...supplyColumnVisibility, [c.key]: !(supplyColumnVisibility[c.key] !== false) }
                      setSupplyColumnVisibility(next)
                      try {
                        localStorage.setItem('ikamdocs_supply_columns', JSON.stringify(next))
                      } catch (_) {}
                    }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSupplyColumnsModalOpen(false)} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Готово</button>
            </div>
          </div>
        </div>
      )}

      {linkModal && entityTree && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !linkConfirming && setLinkModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: 24,
              borderRadius: 16,
              border: '1px solid var(--border)',
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>
              {linkModal === 'category' && 'Подвязать к категории'}
              {linkModal === 'supplier' && 'Подвязать к поставщику'}
              {linkModal === 'manufacturer' && 'Подвязать к производителю'}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                {linkModal === 'category' && 'Категория'}
                {linkModal === 'supplier' && 'Поставщик'}
                {linkModal === 'manufacturer' && 'Производитель'}
              </label>
              <select
                value={linkSelectedId}
                onChange={(e) => setLinkSelectedId(e.target.value)}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">— выбрать —</option>
                {linkModal === 'category' && entityTree.categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
                {linkModal === 'supplier' && entityTree.suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
                {linkModal === 'manufacturer' && entityTree.manufacturers.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !linkConfirming && setLinkModal(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text)' }}>Отмена</button>
              <button
                onClick={async () => {
                  if (!linkSelectedId || !token) return
                  setLinkConfirming(true)
                  try {
                    const entityId = parseInt(linkSelectedId, 10)
                    if (linkModal === 'supplier') {
                      for (const id of selectedNomIds) {
                        await fetch('/entities/supplies', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ supplier_id: entityId, nomenclature_id: id }),
                        })
                      }
                    } else {
                      const body = linkModal === 'category'
                        ? { category_id: entityId, subcategory_id: null }
                        : { manufacturer_id: entityId }
                      for (const id of selectedNomIds) {
                        await fetch(`/entities/nomenclature/${id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify(body),
                        })
                      }
                    }
                    setLinkModal(null)
                    setLinkSelectedId('')
                    setSelectedNomIds(new Set())
                    setEntityTree(null)
                    setRefreshKey((k) => k + 1)
                  } catch (e) {
                    alert('Ошибка привязки')
                  } finally {
                    setLinkConfirming(false)
                  }
                }}
                disabled={linkConfirming || !linkSelectedId}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: linkConfirming || !linkSelectedId ? 'not-allowed' : 'pointer' }}
              >
                {linkConfirming ? 'Привязка...' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
