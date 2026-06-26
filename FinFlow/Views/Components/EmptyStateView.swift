import SwiftUI

struct EmptyStateView: View {
    let systemName: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.accentBlue.opacity(0.18), .clear],
                            center: .center,
                            startRadius: 2,
                            endRadius: 70
                        )
                    )
                    .frame(width: 140, height: 140)

                Image(systemName: systemName)
                    .font(.system(size: 44, weight: .light))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(Color.textSecondary)
            }

            Text(title)
                .font(.headline)
                .foregroundStyle(.textPrimary)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

#Preview {
    EmptyStateView(systemName: "tray", title: "暂无记录", subtitle: "点击右上角 + 记一笔")
        .background(Color.bgPrimary)
}
