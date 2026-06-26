import SwiftUI

struct AddTransactionButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "plus")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(
                    LinearGradient(
                        colors: [Color.accentBlue, Color(hex: "#3B6FD8") ?? .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: Circle()
                )
                .overlay(
                    Circle()
                        .stroke(.white.opacity(0.15), lineWidth: 0.5)
                )
                .shadow(color: Color.accentBlue.opacity(0.5), radius: 8, x: 0, y: 3)
        }
    }
}

#Preview {
    ZStack {
        Color.bgPrimary.ignoresSafeArea()
        AddTransactionButton {}
    }
}
