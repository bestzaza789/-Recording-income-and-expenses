# 📱 iOS Personal Finance App with Slip OCR

An iOS-native personal finance application designed for a single user. The app operates 100% offline, storing data locally on the device to ensure absolute privacy and maximum speed. The core value proposition is frictionless expense tracking via automated bank transfer slip scanning (OCR + Parsing).

## 🚀 Key Constraints
- **Platform:** iOS (Target iOS 17+)
- **Architecture:** Local-only (No cloud backend, no login, no internet required)
- **Primary Tech Stack:** SwiftUI, SwiftData, Apple Vision Framework (Local OCR)

## ✨ Core Features
- **Multi-Account Management:** Manage multiple "wallets" or bank accounts (e.g., Cash, KBank, SCB, Credit Card).
- **Custom Categories:** Create, edit, or delete income/expense categories with custom names, colors, and SF Symbols.
- **Slip Scanner (OCR):** Upload a bank transfer slip image. The app extracts text locally, parses the amount, detects the source account, guesses the category, and fills the form automatically.
- **Account Transfers:** Log money moving between accounts (e.g., ATM withdrawal: KBank -> Cash) without affecting net worth.
- **Dashboard & Analytics:** Visual feedback of net worth, account balances, and category breakdowns using Swift Charts.

## 🛠 Tech Stack Details
- **UI Framework:** SwiftUI
- **Local Database:** SwiftData
- **OCR Engine:** Apple Vision Framework (`VNRecognizeTextRequest` supporting `th-TH` and `en-US`)
- **Charts:** Swift Charts

## 📁 Project Documentation
- **[TODO.md](./TODO.md)**: Development checklist and progress tracker.

---
*Note: This project is designed as a standalone, offline-first application prioritizing user privacy and data ownership.*
