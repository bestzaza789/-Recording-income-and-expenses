import SwiftUI
import SwiftData
import Charts

struct AnalyticsView: View {
    @Query private var transactions: [Transaction]
    
    struct MonthlyData: Identifiable {
        let id = UUID()
        let month: Date
        let type: String // "Income" or "Expense"
        let amount: Double
    }
    
    var chartData: [MonthlyData] {
        var data: [MonthlyData] = []
        let calendar = Calendar.current
        
        let groupedByMonth = Dictionary(grouping: transactions) { transaction -> Date in
            let components = calendar.dateComponents([.year, .month], from: transaction.date)
            return calendar.date(from: components) ?? transaction.date
        }
        
        for (month, monthTransactions) in groupedByMonth {
            let income = monthTransactions.filter { $0.transactionType == "income" }.reduce(0) { $0 + $1.amount }
            let expense = monthTransactions.filter { $0.transactionType == "expense" }.reduce(0) { $0 + $1.amount }
            
            data.append(MonthlyData(month: month, type: "Income", amount: income))
            data.append(MonthlyData(month: month, type: "Expense", amount: expense))
        }
        
        return data.sorted { $0.month < $1.month }
    }
    
    var body: some View {
        NavigationStack {
            VStack {
                if chartData.isEmpty {
                    Text("Not enough data for analytics.")
                        .foregroundColor(.secondary)
                } else {
                    Chart(chartData) { data in
                        BarMark(
                            x: .value("Month", data.month, unit: .month),
                            y: .value("Amount", data.amount)
                        )
                        .foregroundStyle(by: .value("Type", data.type))
                        .position(by: .value("Type", data.type))
                    }
                    .chartForegroundStyleScale([
                        "Income": Color.green,
                        "Expense": Color.red
                    ])
                    .frame(height: 300)
                    .padding()
                }
                Spacer()
            }
            .navigationTitle("Analytics")
        }
    }
}
