# 📱 Personal Finance App Development Checklist

## 1. Project Setup & Architecture
- [x] Initialize new iOS project in Xcode (SwiftUI, Target iOS 17+).
- [x] Setup SwiftData in the project (`ModelContainer`, `App` struct).
- [x] Set up GitHub repository and initial commit.

## 2. SwiftData Models
- [x] Create `Account` model (id, name, accountType, initialBalance, currentBalance, transactions).
- [x] Create `Category` model (id, name, type, iconName, hexColor).
- [x] Create `Transaction` model (id, amount, transactionType, date, note, account, toAccount, category).
- [x] Define relationships between models (Transaction -> Account, Transaction -> Category).

## 3. Business Logic (Balance Recalculation Engine)
- [x] Implement transaction manager to handle creation (Expense, Income, Transfer).
- [x] Implement balance updating logic on transaction creation.
- [x] Implement balance updating logic on transaction deletion (reverse calculation).
- [x] Implement balance updating logic on transaction edit (delta calculation).

## 4. UI/UX: Core App Structure
- [x] Create main `TabView` with 4 tabs: Dashboard, Transactions, Management, Analytics.
- [x] Set up base placeholder views for each tab with SF Symbols icons.

## 5. UI/UX: Management Tab (Data Entry Setup)
- [x] Create Accounts list view.
- [x] Create "Add/Edit Account" form view.
- [x] Create Categories list view (segmented into Income/Expense).
- [x] Create "Add/Edit Category" form view (with Icon picker & Color picker).

## 6. UI/UX: Dashboard Tab
- [x] Build Header View for Total Net Worth.
- [x] Build Account Carousel View (horizontal scrolling cards).
- [x] Build Monthly Expense Summary View (Swift Charts - Pie Chart).
- [x] Build Recent Transactions List View.
- [x] Implement Floating Action Button (+) for manual entry and scan options.

## 7. Core Feature: Transaction Forms
- [x] Create "Manual Entry" Form View (Amount, Type, Date, Account, Category, Note).
- [x] Create "Transfer" Form View (Amount, Date, From Account, To Account, Note).
- [x] Ensure Balance Recalculation Engine triggers correctly from forms.

## 8. Core Feature: OCR & Parsing Engine (Apple Vision)
- [x] Set up `PhotosPicker` to select bank slip images.
- [x] Implement `VNRecognizeTextRequest` service (Languages: `th-TH`, `en-US`, Level: `.accurate`).
- [x] Create text extraction parser (Regex for Amount: `\d{1,3}(,\d{3})*\.\d{2}`).
- [x] Implement Account detection logic (Keywords: KBank, กสิกร, SCB, ไทยพาณิชย์).
- [x] Implement Smart Categorization logic based on merchant names (e.g., 7-Eleven, PTT).
- [x] Create "Pre-filled Form View" that receives parsed OCR data for user confirmation.

## 9. UI/UX: Transactions Log Tab
- [x] Build Transactions list grouped by date.
- [x] Implement Search bar (filter by note, category, account).
- [x] Add swipe-to-delete functionality (linked to recalculation engine).

## 10. UI/UX: Analytics Tab
- [x] Build Month-over-Month trend chart (Bar chart comparing Income vs Expense using Swift Charts).

## 11. Testing & Polish
- [ ] Test all data operations safely on the main thread.
- [ ] Verify UI refreshes correctly upon data changes.
- [ ] Test OCR parsing with various real-world Thai bank slips.
- [ ] Finalize UI styling (colors, padding, typography).
- [ ] Prepare app icon and launch screen.
