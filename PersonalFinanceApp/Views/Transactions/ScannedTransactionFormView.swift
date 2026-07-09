import SwiftUI
import SwiftData

struct ScannedTransactionFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    @Query private var accounts: [Account]
    @Query private var categories: [Category]
    
    @State private var amount: Double
    @State private var selectedAccount: Account?
    @State private var selectedCategory: Category?
    @State private var note = "Scanned from slip"
    
    var parsedData: OCRService.ParsedData
    
    init(parsedData: OCRService.ParsedData) {
        self.parsedData = parsedData
        _amount = State(initialValue: parsedData.amount ?? 0.0)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Verify OCR Details")) {
                    TextField("Amount (฿)", value: $amount, format: .number)
                        .keyboardType(.decimalPad)
                    
                    Picker("Account", selection: $selectedAccount) {
                        Text("Select Account").tag(Account?.none)
                        ForEach(accounts) { account in
                            Text(account.name).tag(Account?.some(account))
                        }
                    }
                    
                    Picker("Category", selection: $selectedCategory) {
                        Text("Select Category").tag(Category?.none)
                        ForEach(categories.filter { $0.type == "expense" }) { category in
                            Text(category.name).tag(Category?.some(category))
                        }
                    }
                }
                
                Section(header: Text("Note")) {
                    TextField("Note", text: $note)
                }
            }
            .navigationTitle("Confirm Scanned Slip")
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
                setupDefaults()
            }
        }
    }
    
    private func setupDefaults() {
        if let accKeyword = parsedData.accountKeyword {
            selectedAccount = accounts.first(where: { $0.name.lowercased().contains(accKeyword) })
        }
        if selectedAccount == nil { selectedAccount = accounts.first }
        
        if let catKeyword = parsedData.categoryKeyword {
            let expenseCats = categories.filter { $0.type == "expense" }
            if catKeyword == "food" {
                selectedCategory = expenseCats.first(where: { $0.name.lowercased().contains("food") || $0.name.lowercased().contains("อาหาร") })
            } else if catKeyword == "transport" {
                selectedCategory = expenseCats.first(where: { $0.name.lowercased().contains("transport") || $0.name.lowercased().contains("เดิน") })
            }
        }
        if selectedCategory == nil { selectedCategory = categories.filter { $0.type == "expense" }.first }
    }
    
    private func saveTransaction() {
        guard let account = selectedAccount, let category = selectedCategory else { return }
        TransactionManager.shared.addTransaction(
            amount: amount,
            type: "expense",
            date: Date(),
            note: note,
            account: account,
            toAccount: nil,
            category: category,
            context: modelContext
        )
        dismiss()
    }
}
