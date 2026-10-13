import SwiftUI
import WidgetKit

// Сводку пишет приложение (WebView.swift) в общий UserDefaults группы
private let appGroup = "group.io.github.qwekurasa.kesh"

struct Summary: Codable {
    var total: String
    var today: String
    var income: String
    var period: String
    var month: String
    var todayLabel: String
    var acts: [String]
    var ts: Double

    static func load() -> Summary? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "summary"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Summary.self, from: data)
    }

    var date: Date { Date(timeIntervalSince1970: ts / 1000) }
    var isThisMonth: Bool { Calendar.current.isDate(date, equalTo: .now, toGranularity: .month) }
    var isToday: Bool { Calendar.current.isDateInToday(date) }
}

struct Entry: TimelineEntry {
    let date: Date
    let summary: Summary?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, summary: .sample) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: .now, summary: Summary.load() ?? .sample))
    }
    // Новые данные приходят при открытии приложения; в полночь обнуляем «сегодня»
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let midnight = Calendar.current.startOfDay(for: .now.addingTimeInterval(86400))
        completion(Timeline(entries: [Entry(date: .now, summary: Summary.load())], policy: .after(midnight)))
    }
}

extension Summary {
    static let sample = Summary(total: "18 771 ₽", today: "1 240 ₽", income: "50 000 ₽", period: "1–31 окт",
                                month: "Расходы за месяц", todayLabel: "Сегодня",
                                acts: ["Расход", "Доход", "Аналитика", "Бюджет", "Вклады"], ts: Date.now.timeIntervalSince1970 * 1000)
}

// Цвета приложения
private extension Color {
    static let bg = Color(red: 0.07, green: 0.07, blue: 0.078)
    static let text = Color(red: 0.925, green: 0.925, blue: 0.933)
    static let text2 = Color(red: 0.545, green: 0.545, blue: 0.576)
    static let accent = Color(red: 0.651, green: 0.941, blue: 0.776)
    static let raised = Color.white.opacity(0.07)
}

private let actions: [(id: String, icon: String)] = [
    ("out", "minus"), ("in", "plus"), ("charts", "chart.bar.fill"), ("budget", "wallet.pass"), ("deposits", "banknote"),
]

private func link(_ id: String) -> URL { URL(string: "kesh://\(id)")! }

struct Brand: View {
    var body: some View {
        HStack(spacing: 6) {
            Image("Logo").resizable().frame(width: 18, height: 18).clipShape(RoundedRectangle(cornerRadius: 5))
            Text("Кэш").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.text)
        }
    }
}

struct WidgetBody: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry

    var s: Summary? { entry.summary }
    var total: String { s.map { $0.isThisMonth ? $0.total : "—" } ?? "—" }
    var today: String { s.map { $0.isToday ? $0.today : "—" } ?? "—" }
    var monthLabel: String { s?.month ?? "Расходы за месяц" }
    var todayLabel: String { s?.todayLabel ?? "Сегодня" }
    var acts: [String] { s?.acts ?? Summary.sample.acts }

    var body: some View {
        switch family {
        case .systemSmall: small
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .accessoryInline: Text("Кэш · \(total)")
        default: medium
        }
    }

    // 4×2: сводка сверху, быстрые действия снизу
    var medium: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                Brand()
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(monthLabel).font(.system(size: 11)).foregroundStyle(Color.text2)
                    Text(total).font(.system(size: 22, weight: .semibold).monospacedDigit()).foregroundStyle(Color.text)
                        .minimumScaleFactor(0.6).lineLimit(1)
                    Text("\(s?.period ?? "") · \(todayLabel.lowercased()) \(today)")
                        .font(.system(size: 11).monospacedDigit()).foregroundStyle(Color.text2).lineLimit(1)
                }
            }
            Spacer(minLength: 8)
            HStack(spacing: 0) {
                ForEach(Array(actions.enumerated()), id: \.offset) { i, a in
                    Link(destination: link(a.id)) {
                        VStack(spacing: 5) {
                            Image(systemName: a.icon)
                                .font(.system(size: 15, weight: .semibold))
                                .frame(width: 38, height: 38)
                                .background(i == 0 ? Color.accent : Color.raised, in: Circle())
                                .foregroundStyle(i == 0 ? Color.bg : Color.text)
                            Text(i < acts.count ? acts[i] : "").font(.system(size: 10)).foregroundStyle(Color.text2).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }

    // 2×2: сумма месяца, нажатие — новая трата
    var small: some View {
        VStack(alignment: .leading, spacing: 0) {
            Brand()
            Spacer()
            Text(monthLabel).font(.system(size: 11)).foregroundStyle(Color.text2)
            Text(total).font(.system(size: 22, weight: .semibold).monospacedDigit()).foregroundStyle(Color.text)
                .minimumScaleFactor(0.5).lineLimit(1)
            Text("\(todayLabel) \(today)").font(.system(size: 11).monospacedDigit()).foregroundStyle(Color.text2).lineLimit(1)
            Spacer()
            HStack(spacing: 6) {
                Image(systemName: "minus").font(.system(size: 12, weight: .bold))
                    .frame(width: 24, height: 24).background(Color.accent, in: Circle()).foregroundStyle(Color.bg)
                Text(acts.first ?? "Расход").font(.system(size: 12, weight: .medium)).foregroundStyle(Color.text)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(link("out"))
    }

    // Экран блокировки
    var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("Кэш · \(s?.period ?? "")").font(.system(size: 12, weight: .semibold))
            Text(total).font(.system(size: 17, weight: .semibold).monospacedDigit()).minimumScaleFactor(0.6).lineLimit(1)
            Text("\(todayLabel) \(today)").font(.system(size: 12).monospacedDigit()).lineLimit(1)
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
        StaticConfiguration(kind: "KeshWidget", provider: Provider()) { entry in
            WidgetBody(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color(red: 0.11, green: 0.11, blue: 0.12), .bg], startPoint: .top, endPoint: .bottom)
                }
        }
        .configurationDisplayName("Кэш")
        .description("Расходы за месяц и быстрые действия")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct KeshWidgets: WidgetBundle {
    var body: some Widget { KeshWidget() }
}
