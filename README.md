# Kasastok — Inventory and Cash Management System

Kasastok is a modular inventory, point-of-sale, and financial ledger management system designed for small and medium-sized businesses. The system tracks product stock levels, purchase/sale transactions, expiration cycles, and cash flow operations while providing analytical dashboards for business insights.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (component-based UI), React Router |
| Backend | .NET 7 Web API (planned) |
| Database | PostgreSQL (planned), EF Core migrations |
| Visualization | Chart.js (upcoming) |
| Auth | JWT (upcoming) |

## Core Features

### Inventory Management
- Product creation with category, barcode, unit type (piece/kg/liter)
- Dual pricing model: cost price & sale price
- Optional expiration tracking (SKT)
- Stock level warnings and threshold alerts

### Sales / POS
- Barcode-based cart operations
- Sale price driven revenue calculation
- Profit calculation = (salePrice - costPrice)
- Cash ledger entry after completed sale

### Financial Ledger
- Daily/weekly/monthly income & expense tracking
- Payment types: cash, POS, bank transfer

### Analytics & Dashboard
- Stock value computation
- Profit breakdown
- Best-selling products
- Expiration risk indicators
- Category-based sales distribution

## Project Structure

