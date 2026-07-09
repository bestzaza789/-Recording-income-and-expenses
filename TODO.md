# 📱 Personal Finance App Development Checklist

## 1. Project Setup & Architecture
- [ ] Initialize new iOS project in Xcode (SwiftUI, Target iOS 17+).
- [ ] Setup SwiftData in the project (`ModelContainer`, `App` struct).
- [ ] Set up GitHub repository and initial commit.

## 2. SwiftData Models
- [ ] Create `Account` model (id, name, accountType, initialBalance, currentBalance, transactions).
- [ ] Create `Category` model (id, name, type, iconName, hexColor).
- [ ] Create `Transaction` model (id, amount, transactionType, date, note, account, toAccount, category).
- [ ] Define relationships between models (Transaction -> Account, Transaction -> Category).

## 3. Business Logic (Balance Recalculation Engine)
- [ ] Implement transaction manager to handle creation (Expense, Income, Transfer).
- [ ] Implement balance updating logic on transaction creation.
- [ ] Implement balance updating logic on transaction deletion (reverse calculation).
- [ ] Implement balance updating logic on transaction edit (delta calculation).

## 4. UI/UX: Core App Structure
- [ ] Create main `TabView` with 4 tabs: Dashboard, Transactions, Management, Analytics.
- [ ] Set up base placeholder views for each tab with SF Symbols icons.

## 5. UI/UX: Management Tab (Data Entry Setup)
- [ ] Create Accounts list view.
- [ ] Create "Add/Edit Account" form view.
- [ ] Create Categories list view (segmented into Income/Expense).
- [ ] Create "Add/Edit Category" form view (with Icon picker & Color picker).

## 6. UI/UX: Dashboard Tab
- [ ] Build Header View for Total Net Worth.
- [ ] Build Account Carousel View (horizontal scrolling cards).
- [ ] Build Monthly Expense Summary View (Swift Charts - Pie Chart).
- [ ] Build Recent Transactions List View.
- [ ] Implement Floating Action Button (+) for manual entry and scan options.

## 7. Core Feature: Transaction Forms
- [ ] Create "Manual Entry" Form View (Amount, Type, Date, Account, Category, Note).
- [ ] Create "Transfer" Form View (Amount, Date, From Account, To Account, Note).
- [ ] Ensure Balance Recalculation Engine triggers correctly from forms.

## 8. Core Feature: OCR & Parsing Engine (Apple Vision)
- [ ] Set up `PhotosPicker` to select bank slip images.
- [ ] Implement `VNRecognizeTextRequest` service (Languages: `th-TH`, `en-US`, Level: `.accurate`).
- [ ] Create text extraction parser (Regex for Amount: `\d{1,3}(,\d{3})*\.\d{2}`).
- [ ] Implement Account detection logic (Keywords: KBank, กสิกร, SCB, ไทยพาณิชย์).
- [ ] Implement Smart Categorization logic based on merchant names (e.g., 7-Eleven, PTT).
- [ ] Create "Pre-filled Form View" that receives parsed OCR data for user confirmation.

## 9. UI/UX: Transactions Log Tab
- [ ] Build Transactions list grouped by date.
- [ ] Implement Search bar (filter by note, category, account).
- [ ] Add swipe-to-delete functionality (linked to recalculation engine).

## 10. UI/UX: Analytics Tab
- [ ] Build Month-over-Month trend chart (Bar chart comparing Income vs Expense using Swift Charts).

## 11. Testing & Polish
- [ ] Test all data operations safely on the main thread.
- [ ] Verify UI refreshes correctly upon data changes.
- [ ] Test OCR parsing with various real-world Thai bank slips.
- [ ] Finalize UI styling (colors, padding, typography).
- [ ] Prepare app icon and launch screen.
