import SwiftUI
import SwiftData

struct ManualEntryFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Query private var accounts: [Account]
    @Query private var categories: [Category]
    
    @State private var amount: Double = 0.0
    @State private var type = "expense"
    @State private var date = Date()
    @State private var selectedAccount: Account?
    @State private var selectedCategory: Category?
    @State private var note = ""
    
    var filteredCategories: [Category] {
        categories.filter { $0.type == type }
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Type", selection: $type) {
                        Text("Expense").tag("expense")
                        Text("Income").tag("income")
                    }
                    .pickerStyle(.segmented)
                }
                
                Section(header: Text("Details")) {
                    TextField("Amount (฿)", value: $amount, format: .number)
                        .keyboardType(.decimalPad)
                    
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    
                    Picker("Account", selection: $selectedAccount) {
                        Text("Select Account").tag(Account?.none)
                        ForEach(accounts) { account in
                            Text(account.name).tag(Account?.some(account))
                        }
                    }
                    
                    Picker("Category", selection: $selectedCategory) {
                        Text("Select Category").tag(Category?.none)
                        ForEach(filteredCategories) { category in
                            Text(category.name).tag(Category?.some(category))
                        }
                    }
                }
                
                Section(header: Text("Note (Optional)")) {
                    TextField("Note", text: $note)
                }
            }
            .navigationTitle("Manual Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveTransaction()
                    }
                    .disabled(amount <= 0 || selectedAccount == nil || selectedCategory == nil)
                }
            }
            .onAppear {
                if selectedAccount == nil { selectedAccount = accounts.first }
                if selectedCategory == nil { selectedCategory = filteredCategories.first }
            }
            .onChange(of: type) { _ in
                selectedCategory = filteredCategories.first
            }
        }
    }
    
    private func saveTransaction() {
        guard let account = selectedAccount, let category = selectedCategory else { return }
        TransactionManager.shared.addTransaction(
            amount: amount,
            type: type,
            date: date,
            note: note.isEmpty ? nil : note,
            account: account,
            toAccount: nil,
            category: category,
            context: modelContext
        )
        dismiss()
    }
}
