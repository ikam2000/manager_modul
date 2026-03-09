# -*- coding: utf-8 -*-
"""Pydantic-схемы для сущностей."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    company_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None


class CategoryOut(BaseModel):
    id: int
    company_id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubCategoryCreate(BaseModel):
    category_id: int
    name: str


class SubCategoryUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None


class SubCategoryOut(BaseModel):
    id: int
    category_id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierCreate(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None
    inn: str | None = None
    kpp: str | None = None
    ogrn: str | None = None
    email: str | None = None
    legal_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    inn: str | None = None
    kpp: str | None = None
    ogrn: str | None = None
    email: str | None = None
    legal_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    extra_fields: dict[str, Any] | None = None


class SupplierOut(BaseModel):
    id: int
    company_id: int
    name: str
    phone: str | None
    address: str | None
    inn: str | None
    kpp: str | None
    ogrn: str | None
    email: str | None
    legal_address: str | None
    bank_name: str | None
    bank_bik: str | None
    bank_account: str | None
    bank_corr: str | None
    contact_person: str | None
    delivery_address: str | None
    supply_address: str | None
    extra_fields: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ManufacturerCreate(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    inn: str | None = None
    kpp: str | None = None
    ogrn: str | None = None
    email: str | None = None
    legal_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None


class ManufacturerUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    inn: str | None = None
    kpp: str | None = None
    ogrn: str | None = None
    email: str | None = None
    legal_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    extra_fields: dict[str, Any] | None = None


class ManufacturerOut(BaseModel):
    id: int
    company_id: int
    name: str
    address: str | None
    phone: str | None
    inn: str | None
    kpp: str | None
    ogrn: str | None
    email: str | None
    legal_address: str | None
    bank_name: str | None
    bank_bik: str | None
    bank_account: str | None
    bank_corr: str | None
    contact_person: str | None
    delivery_address: str | None
    supply_address: str | None
    extra_fields: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NomenclatureCreate(BaseModel):
    code: str | None = None
    name: str
    price: float | None = None
    category_id: int | None = None
    subcategory_id: int | None = None
    tag_number: str | None = None
    package_number: str | None = None
    specification: str | None = None
    question_sheet_no: str | None = None
    manufacturer_id: int | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None
    # Trader fields
    barcode: str | None = None
    purchase_price: float | None = None
    markup_percent: float | None = None
    stock: float | None = None
    expiry_date: date | None = None
    supplier_id: int | None = None


class NomenclatureUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    price: float | None = None
    category_id: int | None = None
    subcategory_id: int | None = None
    tag_number: str | None = None
    package_number: str | None = None
    specification: str | None = None
    question_sheet_no: str | None = None
    manufacturer_id: int | None = None
    extra_fields: dict[str, Any] | None = None
    is_deleted: bool | None = None
    # Trader fields
    barcode: str | None = None
    purchase_price: float | None = None
    price_currency: str | None = None
    markup_percent: float | None = None
    stock: float | None = None
    expiry_date: date | None = None
    supplier_id: int | None = None


class NomenclatureOut(BaseModel):
    id: int
    company_id: int
    code: str | None
    name: str
    price: float | None
    category_id: int | None
    subcategory_id: int | None
    tag_number: str | None
    package_number: str | None
    specification: str | None
    question_sheet_no: str | None
    manufacturer_id: int | None
    extra_fields: dict | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    # Trader fields
    barcode: str | None = None
    purchase_price: float | None = None
    price_currency: str | None = None
    markup_percent: float | None = None
    stock: float | None = None
    expiry_date: date | None = None
    supplier_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class SupplyCreate(BaseModel):
    supplier_id: int | None = None
    nomenclature_id: int | None = None
    quantity: float = 1.0
    production_date: date | None = None
    delivery_date: date | None = None
    calibration_date: date | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None


class SupplyUpdate(BaseModel):
    supplier_id: int | None = None
    nomenclature_id: int | None = None
    quantity: float | None = None
    production_date: date | None = None
    delivery_date: date | None = None
    calibration_date: date | None = None
    extra_fields: dict[str, Any] | None = None


class SupplyOut(BaseModel):
    id: int
    company_id: int
    supplier_id: int | None
    nomenclature_id: int | None
    quantity: float
    production_date: date | None
    delivery_date: date | None
    calibration_date: date | None
    extra_fields: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplyBatchItem(BaseModel):
    nomenclature_id: int
    quantity: float = 1.0


class SupplyBatchCreate(BaseModel):
    supplier_id: int
    production_date: date | None = None
    delivery_date: date | None = None
    extra_fields: dict[str, Any] | None = None
    items: list[SupplyBatchItem]


class CustomerCreate(BaseModel):
    name: str
    inn: str | None = None
    kpp: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    legal_address: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    inn: str | None = None
    kpp: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    legal_address: str | None = None
    delivery_address: str | None = None
    supply_address: str | None = None
    bank_name: str | None = None
    bank_bik: str | None = None
    bank_account: str | None = None
    bank_corr: str | None = None
    contact_person: str | None = None
    extra_fields: dict[str, Any] | None = None


class CustomerOut(BaseModel):
    id: int
    company_id: int
    name: str
    inn: str | None
    kpp: str | None
    address: str | None
    phone: str | None
    email: str | None
    legal_address: str | None
    delivery_address: str | None
    supply_address: str | None
    bank_name: str | None
    bank_bik: str | None
    bank_account: str | None
    bank_corr: str | None
    contact_person: str | None
    extra_fields: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContractCreate(BaseModel):
    supplier_id: int | None = None
    number: str | None = None
    date_start: date | None = None
    date_end: date | None = None
    extra_fields: dict[str, Any] | None = None
    company_id: int | None = None


class ContractUpdate(BaseModel):
    supplier_id: int | None = None
    number: str | None = None
    date_start: date | None = None
    date_end: date | None = None
    extra_fields: dict[str, Any] | None = None


class ContractOut(BaseModel):
    id: int
    company_id: int
    supplier_id: int | None
    number: str | None
    date_start: date | None
    date_end: date | None
    extra_fields: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContractAppendixCreate(BaseModel):
    contract_id: int
    name: str
    extra_fields: dict[str, Any] | None = None


class ContractAppendixUpdate(BaseModel):
    contract_id: int | None = None
    name: str | None = None
    extra_fields: dict[str, Any] | None = None


class ContractAppendixOut(BaseModel):
    id: int
    contract_id: int
    name: str
    extra_fields: dict | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
