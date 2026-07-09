import Foundation
import SwiftData

@MainActor
class TransactionManager {
    static let shared = TransactionManager()
    
    private init() {}
    
    // MARK: - Create
    func addTransaction(amount: Double, type: String, date: Date, note: String?, account: Account, toAccount: Account?, category: Category?, context: ModelContext) {
        let transaction = Transaction(amount: amount, transactionType: type, date: date, note: note)
        transaction.account = account
        transaction.category = category
        
        if type == "transfer", let destination = toAccount {
            transaction.toAccount = destination
            account.currentBalance -= amount
            destination.currentBalance += amount
        } else if type == "expense" {
            account.currentBalance -= amount
        } else if type == "income" {
            account.currentBalance += amount
        }
        
        context.insert(transaction)
    }
    
    // MARK: - Delete
    func deleteTransaction(_ transaction: Transaction, context: ModelContext) {
        if transaction.transactionType == "transfer", let destination = transaction.toAccount {
            transaction.account?.currentBalance += transaction.amount
            destination.currentBalance -= transaction.amount
        } else if transaction.transactionType == "expense" {
            transaction.account?.currentBalance += transaction.amount
        } else if transaction.transactionType == "income" {
            transaction.account?.currentBalance -= transaction.amount
        }
        
        context.delete(transaction)
    }
    
    // MARK: - Update
    func updateTransaction(_ transaction: Transaction, newAmount: Double, newType: String, newAccount: Account, newToAccount: Account?, newCategory: Category?, context: ModelContext) {
        // Reverse old transaction impact
        if transaction.transactionType == "transfer", let oldDestination = transaction.toAccount {
            transaction.account?.currentBalance += transaction.amount
            oldDestination.currentBalance -= transaction.amount
        } else if transaction.transactionType == "expense" {
            transaction.account?.currentBalance += transaction.amount
        } else if transaction.transactionType == "income" {
            transaction.account?.currentBalance -= transaction.amount
        }
        
        // Update fields
        transaction.amount = newAmount
        transaction.transactionType = newType
        transaction.account = newAccount
        transaction.toAccount = newToAccount
        transaction.category = newCategory
        
        // Apply new transaction impact
        if newType == "transfer", let destination = newToAccount {
            newAccount.currentBalance -= newAmount
            destination.currentBalance += newAmount
        } else if newType == "expense" {
            newAccount.currentBalance -= newAmount
        } else if newType == "income" {
            newAccount.currentBalance += newAmount
        }
    }
}
