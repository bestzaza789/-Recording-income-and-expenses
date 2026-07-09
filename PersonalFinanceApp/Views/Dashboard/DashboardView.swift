import SwiftUI
import SwiftData
import Charts

struct DashboardView: View {
    @Query private var accounts: [Account]
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    
    @State private var showingActionSheet = false
    @State private var showingManualEntry = false
    @State private var showingTransfer = false
    @State private var showingScanner = false
    
    var totalNetWorth: Double {
        accounts.reduce(0) { $0 + $1.currentBalance }
    }
    
    var recentTransactions: [Transaction] {
        Array(transactions.prefix(5))
    }
    
    var currentMonthExpenses: [Transaction] {
        let calendar = Calendar.current
        let currentMonth = calendar.component(.month, from: Date())
        let currentYear = calendar.component(.year, from: Date())
        
        return transactions.filter {
            $0.transactionType == "expense" &&
            calendar.component(.month, from: $0.date) == currentMonth &&
            calendar.component(.year, from: $0.date) == currentYear
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header
                        VStack(alignment: .leading) {
                            Text("Total Net Worth")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text("฿\(totalNetWorth, specifier: "%.2f")")
                                .font(.system(size: 34, weight: .bold, design: .rounded))
                                .foregroundColor(totalNetWorth >= 0 ? .primary : .red)
                        }
                        .padding(.horizontal)
                        
                        // Account Carousel
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 15) {
                                ForEach(accounts) { account in
                                    AccountCardView(account: account)
                                }
                            }
                            .padding(.horizontal)
                        }
                        
                        // Expense Pie Chart
                        if !currentMonthExpenses.isEmpty {
                            VStack(alignment: .leading) {
                                Text("This Month's Expenses")
                                    .font(.headline)
                                    .padding(.horizontal)
                                
                                Chart(currentMonthExpenses) { transaction in
                                    SectorMark(
                                        angle: .value("Amount", transaction.amount),
                                        innerRadius: .ratio(0.5),
                                        angularInset: 1.5
                                    )
                                    .foregroundStyle(Color(hex: transaction.category?.hexColor ?? "808080") ?? .gray)
                                }
                                .frame(height: 200)
                                .padding()
                            }
                        }
                        
                        // Recent Transactions
                        VStack(alignment: .leading) {
                            HStack {
                                Text("Recent Transactions")
                                    .font(.headline)
                                Spacer()
                            }
                            .padding(.horizontal)
                            
                            ForEach(recentTransactions) { transaction in
                                TransactionRowView(transaction: transaction)
                                    .padding(.horizontal)
                            }
                        }
                    }
                    .padding(.vertical)
                }
                
                // Floating Action Button
                Button(action: { showingActionSheet = true }) {
                    Image(systemName: "plus")
                        .font(.title.weight(.semibold))
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(Circle())
                        .shadow(radius: 4, x: 0, y: 4)
                }
                .padding()
                .confirmationDialog("Add Transaction", isPresented: $showingActionSheet) {
                    Button("Manual Entry") { showingManualEntry = true }
                    Button("Transfer") { showingTransfer = true }
                    Button("Scan Slip (OCR)") { showingScanner = true }
                    Button("Cancel", role: .cancel) { }
                }
            }
            .navigationTitle("Dashboard")
            .sheet(isPresented: $showingManualEntry) {
                // To be implemented in Step 7
                Text("Manual Entry Form")
            }
            .sheet(isPresented: $showingTransfer) {
                // To be implemented in Step 7
                Text("Transfer Form")
            }
            .sheet(isPresented: $showingScanner) {
                // To be implemented in Step 8
                Text("Slip Scanner")
            }
        }
    }
}

struct AccountCardView: View {
    let account: Account
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(account.name)
                .font(.headline)
                .foregroundColor(.white)
            Spacer()
            Text("฿\(account.currentBalance, specifier: "%.2f")")
                .font(.title3.bold())
                .foregroundColor(.white)
        }
        .padding()
        .frame(width: 150, height: 100)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(LinearGradient(gradient: Gradient(colors: [Color.blue, Color.purple]), startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .shadow(color: .gray.opacity(0.3), radius: 5, x: 0, y: 2)
    }
}

struct TransactionRowView: View {
    let transaction: Transaction
    
    var body: some View {
        HStack {
            Image(systemName: transaction.category?.iconName ?? (transaction.transactionType == "transfer" ? "arrow.left.arrow.right" : "dollarsign.circle.fill"))
                .foregroundColor(Color(hex: transaction.category?.hexColor ?? "808080") ?? .gray)
                .font(.title2)
                .frame(width: 40, height: 40)
                .background(Color.gray.opacity(0.1))
                .clipShape(Circle())
            
            VStack(alignment: .leading) {
                Text(transaction.category?.name ?? transaction.note ?? transaction.transactionType.capitalized)
                    .font(.subheadline.bold())
                Text(transaction.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(transaction.transactionType == "expense" ? "-" : (transaction.transactionType == "income" ? "+" : ""))฿\(transaction.amount, specifier: "%.2f")")
                .font(.subheadline.bold())
                .foregroundColor(transaction.transactionType == "expense" ? .red : (transaction.transactionType == "income" ? .green : .blue))
        }
        .padding(.vertical, 8)
    }
}
