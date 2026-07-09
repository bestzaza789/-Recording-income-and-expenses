import SwiftUI
import SwiftData

struct CategoriesListView: View {
    @Query private var categories: [Category]
    @State private var showingAddCategory = false
    @State private var selectedType = "expense"
    
    var filteredCategories: [Category] {
        categories.filter { $0.type == selectedType }
    }
    
    var body: some View {
        VStack {
            Picker("Category Type", selection: $selectedType) {
                Text("Expense").tag("expense")
                Text("Income").tag("income")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            
            List {
                ForEach(filteredCategories) { category in
                    HStack {
                        Image(systemName: category.iconName)
                            .foregroundColor(Color(hex: category.hexColor) ?? .primary)
                        Text(category.name)
                    }
                }
            }
            .overlay {
                if filteredCategories.isEmpty {
                    Text("No categories yet.")
                        .foregroundColor(.secondary)
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showingAddCategory = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddCategory) {
            CategoryFormView(defaultType: selectedType)
        }
    }
}

// Extension to help with hex colors
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0

        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        self.init(
            .sRGB,
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0,
            opacity: 1.0
        )
    }
}
