import SwiftUI

struct CategoryIcon: View {
    let systemName: String
    let color: Color
    var size: CGFloat = 40

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size * 0.5, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                LinearGradient(
                    colors: [color, color.opacity(0.75)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: Circle()
            )
            .overlay(
                Circle()
                    .stroke(.white.opacity(0.08), lineWidth: 0.5)
            )
    }
}

#Preview {
    HStack(spacing: 16) {
        CategoryIcon(systemName: "fork.knife", color: .expenseGold)
        CategoryIcon(systemName: "car.fill", color: .transferBlue)
        CategoryIcon(systemName: "dollarsign.circle.fill", color: .incomeGreen, size: 48)
    }
    .padding()
    .background(Color.bgPrimary)
}
