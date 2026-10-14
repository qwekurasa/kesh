import SwiftUI
import WidgetKit

// Виджет без общих данных с приложением (App Group недоступен на бесплатном Apple ID):
// только быстрые действия, каждое открывает нужный экран Кэша по ссылке kesh://…

struct Entry: TimelineEntry { let date: Date }

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry(date: .now)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        completion(Timeline(entries: [Entry(date: .now)], policy: .never))
    }
}

private extension Color {
    static let bg = Color(red: 0.035, green: 0.035, blue: 0.04)
    static let text = Color(red: 0.93, green: 0.93, blue: 0.94)
    static let text2 = Color(red: 0.6, green: 0.6, blue: 0.64)
    static let raised = Color.white.opacity(0.08)
}

private let actions: [(id: String, icon: String, title: String)] = [
    ("out", "minus", "Расход"), ("in", "plus", "Доход"), ("charts", "chart.bar.fill", "Аналитика"), ("budget", "wallet.pass", "Бюджет"),
]

private func link(_ id: String) -> URL { URL(string: "kesh://\(id)")! }

struct Brand: View {
    var body: some View {
        HStack(spacing: 6) {
            Image("Logo").resizable().frame(width: 20, height: 20).clipShape(RoundedRectangle(cornerRadius: 5))
            Text("Кэш").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.text)
        }
    }
}

struct WidgetBody: View {
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall: small
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .accessoryInline: Text("Кэш · новая трата")
        default: medium
        }
    }

    // 2×2: крупная кнопка «Добавить трату»
    var small: some View {
        VStack(alignment: .leading, spacing: 0) {
            Brand()
            Spacer()
            Image(systemName: "minus")
                .font(.system(size: 20, weight: .bold))
                .frame(width: 46, height: 46)
                .background(Color.text, in: Circle())
                .foregroundStyle(Color.bg)
            Spacer(minLength: 10)
            Text("Новая трата").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.text)
            Text("нажмите, чтобы добавить").font(.system(size: 11)).foregroundStyle(Color.text2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(link("out"))
    }

    // 4×2: четыре быстрых действия
    var medium: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Brand()
                Spacer()
                Text("быстрые действия").font(.system(size: 11)).foregroundStyle(Color.text2)
            }
            Spacer(minLength: 8)
            HStack(spacing: 0) {
                ForEach(Array(actions.enumerated()), id: \.offset) { i, a in
                    Link(destination: link(a.id)) {
                        VStack(spacing: 6) {
                            Image(systemName: a.icon)
                                .font(.system(size: 16, weight: .semibold))
                                .frame(width: 44, height: 44)
                                .background(i == 0 ? Color.text : Color.raised, in: Circle())
                                .foregroundStyle(i == 0 ? Color.bg : Color.text)
                            Text(a.title).font(.system(size: 11)).foregroundStyle(Color.text2).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }

    // Экран блокировки
    var rectangular: some View {
        HStack(spacing: 8) {
            Image(systemName: "plus.circle.fill").font(.system(size: 22))
            VStack(alignment: .leading, spacing: 1) {
                Text("Кэш").font(.system(size: 13, weight: .semibold))
                Text("Новая трата").font(.system(size: 13))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(link("out"))
    }

    var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: "plus").font(.system(size: 20, weight: .bold))
        }
        .widgetURL(link("out"))
    }
}

struct KeshWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KeshWidget", provider: Provider()) { _ in
            WidgetBody()
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color(red: 0.1, green: 0.1, blue: 0.11), .bg], startPoint: .top, endPoint: .bottom)
                }
        }
        .configurationDisplayName("Кэш")
        .description("Быстро добавить трату или открыть нужный экран")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct KeshWidgets: WidgetBundle {
    var body: some Widget { KeshWidget() }
}
