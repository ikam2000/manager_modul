# -*- coding: utf-8 -*-
"""Сущности: номенклатура, поставки, поставщики, договоры и т.д."""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Date, Boolean, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SubCategory(Base):
    __tablename__ = "subcategories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    inn: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    kpp: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    ogrn: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    legal_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_bik: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_corr: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    supply_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    inn: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    kpp: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    ogrn: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    legal_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_bik: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_corr: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    supply_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Nomenclature(Base):
    __tablename__ = "nomenclature"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # код изделия
    name: Mapped[str] = mapped_column(String(255))
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    subcategory_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subcategories.id"), nullable=True
    )
    tag_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # таговый номер
    package_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # номер грузового места
    specification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_sheet_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # № опросного листа
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # цена
    manufacturer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("manufacturers.id"), nullable=True
    )
    # Trader fields (nullable)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    markup_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stock: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)  # primary supplier for trader
    supplier_sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Supplier SKU / артикул поставщика
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # шт/короб/кг/литр
    pack_size: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 12 шт в коробке
    moq: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # minimum order quantity
    price_currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # RUB, USD, EUR
    days_to_expiry: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # альтернатива expiry_date
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Supply(Base):
    __tablename__ = "supplies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    nomenclature_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("nomenclature.id"), nullable=True
    )
    quantity: Mapped[float] = mapped_column(default=1.0)
    production_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # дата изготовления
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # дата поставки
    calibration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # дата поверки
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    date_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class ContractAppendix(Base):
    __tablename__ = "contract_appendices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id"))
    name: Mapped[str] = mapped_column(String(255))
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(255))
    inn: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    kpp: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    legal_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    delivery_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    supply_address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bank_bik: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bank_corr: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extra_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class SupplierCustomer(Base):
    __tablename__ = "supplier_customers"

    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True)


class SupplierManufacturer(Base):
    __tablename__ = "supplier_manufacturers"

    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), primary_key=True)
    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id", ondelete="CASCADE"), primary_key=True)


class CustomerSupplier(Base):
    __tablename__ = "customer_suppliers"

    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), primary_key=True)


class CustomerManufacturer(Base):
    __tablename__ = "customer_manufacturers"

    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True)
    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id", ondelete="CASCADE"), primary_key=True)


class TraderSupplierMarkup(Base):
    __tablename__ = "trader_supplier_markup"

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), primary_key=True)
    markup_percent: Mapped[float] = mapped_column(Float)


class TraderCategoryMarkup(Base):
    __tablename__ = "trader_category_markup"

    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    markup_percent: Mapped[float] = mapped_column(Float)


class TraderMarkupHistory(Base):
    __tablename__ = "trader_markup_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(String(20))  # create, update, delete
    entity_type: Mapped[str] = mapped_column(String(20))  # supplier, category
    entity_id: Mapped[int] = mapped_column(Integer)  # supplier_id or category_id (depending on entity_type)
    entity_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    old_markup_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    new_markup_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
