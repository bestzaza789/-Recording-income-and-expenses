import SwiftUI
import PhotosUI

struct SlipScannerView: View {
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var isProcessing = false
    @State private var parsedData: OCRService.ParsedData?
    @State private var showingForm = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let image = selectedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 300)
                        .cornerRadius(10)
                } else {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 80))
                        .foregroundColor(.gray)
                }
                
                PhotosPicker(selection: $selectedItem, matching: .images, photoLibrary: .shared()) {
                    Label("Select Slip Image", systemImage: "photo")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(10)
                }
                .onChange(of: selectedItem) { _ in
                    Task {
                        if let data = try? await selectedItem?.loadTransferable(type: Data.self),
                           let uiImage = UIImage(data: data) {
                            selectedImage = uiImage
                            processImage(uiImage)
                        }
                    }
                }
                
                if isProcessing {
                    ProgressView("Analyzing Slip...")
                }
            }
            .padding()
            .navigationTitle("Slip Scanner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $showingForm, onDismiss: { dismiss() }) {
                if let data = parsedData {
                    ScannedTransactionFormView(parsedData: data)
                }
            }
        }
    }
    
    private func processImage(_ image: UIImage) {
        isProcessing = true
        OCRService.shared.recognizeText(from: image) { data in
            self.parsedData = data
            self.isProcessing = false
            self.showingForm = true
        }
    }
}
