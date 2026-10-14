import SwiftUI
import WidgetKit

// Виджет без общих данных с приложением (App Group недоступен на бесплатном Apple ID):
// только быстрые действия, каждое открывает нужный экран Кэша по ссылке kesh://…

// phase 0…1 — фаза «дыхания» фона. iOS не даёт анимировать виджет постоянно,
// поэтому свечение медленно меняется от записи к записи (раз в 10 минут, плавный переход)
struct Entry: TimelineEntry { let date: Date; var phase: Double = 0.5 }

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(Entry(date: .now)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let step: TimeInterval = 600
        let entries = (0..<36).map { i in
            Entry(date: .now.addingTimeInterval(Double(i) * step), phase: (sin(Double(i) / 6 * .pi * 2) + 1) / 2)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

private extension Color {
    static let bg = Color(red: 0.035, green: 0.035, blue: 0.04)
    static let text = Color(red: 0.93, green: 0.93, blue: 0.94)
    static let text2 = Color(red: 0.6, green: 0.6, blue: 0.64)
    static let text3 = Color(red: 0.4, green: 0.4, blue: 0.44)
}

private func link(_ id: String) -> URL { URL(string: "kesh://\(id)")! }

// Фон: плавный серо-чёрный градиент со свечением снизу и еле заметным котиком
struct Backdrop: View {
    let phase: Double
    var body: some View {
        ZStack {
            Color.bg
            RadialGradient(colors: [Color(white: 0.17 + phase * 0.06), Color(white: 0.07), Color.bg],
                           center: UnitPoint(x: 0.35 + phase * 0.3, y: 1.15),
                           startRadius: 0, endRadius: 260 + phase * 60)
            RadialGradient(colors: [Color.white.opacity(0.05 + phase * 0.03), .clear],
                           center: UnitPoint(x: 0.85, y: -0.1), startRadius: 0, endRadius: 180)
            Image("Cat").resizable().scaledToFit().opacity(0.05 + phase * 0.03).padding(.horizontal, 30)
        }
        .animation(.easeInOut(duration: 2), value: phase)
    }
}

struct Brand: View {
    var body: some View {
        HStack(spacing: 6) {
            Image("Logo").resizable().frame(width: 18, height: 18).clipShape(RoundedRectangle(cornerRadius: 5))
            Text("Kesh").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.text)
        }
    }
}

// Дата как в приложении: моноширинная, день — ярче
struct DateLabel: View {
    var body: some View {
        Text(Date.now, format: .dateTime.day().month(.abbreviated))
            .font(.system(size: 11, design: .monospaced)).foregroundStyle(Color.text2)
    }
}

// Главная кнопка: белый круг с минусом
struct AddButton: View {
    var size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.06)).frame(width: size + 14, height: size + 14)
            Circle().fill(LinearGradient(colors: [.white, Color(white: 0.82)], startPoint: .top, endPoint: .bottom))
                .frame(width: size, height: size)
                .shadow(color: .white.opacity(0.15), radius: 6)
            Image(systemName: "minus").font(.system(size: size * 0.38, weight: .bold)).foregroundStyle(Color.bg)
        }
    }
}

// Плитка быстрого действия
struct Tile: View {
    let id: String, icon: String, title: String
    var body: some View {
        Link(destination: link(id)) {
            VStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color.text)
                Text(title).font(.system(size: 10.5)).foregroundStyle(Color.text2).lineLimit(1).minimumScaleFactor(0.8)
            }
            .frame(width: 74)
            .frame(maxHeight: .infinity)
            .background(Color.black.opacity(0.3), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.08), lineWidth: 1))
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
        case .accessoryInline: Text("Kesh · новая трата")
        default: medium
        }
    }

    // 2×2: кнопка по центру
    var small: some View {
        VStack(spacing: 0) {
            HStack { Brand(); Spacer() }
            Spacer(minLength: 4)
            AddButton(size: 40)
            Spacer(minLength: 6)
            Text("Новая трата").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.text)
            DateLabel().padding(.top, 2)
        }
        .widgetURL(link("out"))
    }

    // 4×2: по краям плитки, по центру карточка с кнопкой
    var medium: some View {
        VStack(spacing: 8) {
            HStack { Brand(); Spacer(); DateLabel() }
            HStack(spacing: 8) {
                VStack(spacing: 8) {
                    Tile(id: "in", icon: "plus", title: "Доход")
                    Tile(id: "charts", icon: "chart.bar.fill", title: "Аналитика")
                }
                Link(destination: link("out")) {
                    VStack(spacing: 8) {
                        AddButton(size: 34)
                        Text("Новая трата").font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.text)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(
                        LinearGradient(colors: [Color.white.opacity(0.09), Color.white.opacity(0.02)], startPoint: .top, endPoint: .bottom),
                        in: RoundedRectangle(cornerRadius: 18))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.14), lineWidth: 1))
                }
                VStack(spacing: 8) {
                    Tile(id: "budget", icon: "wallet.pass", title: "Бюджет")
                    Tile(id: "deposits", icon: "banknote", title: "Вклады")
                }
            }
        }
    }

    // Экран блокировки
    var rectangular: some View {
        HStack(spacing: 8) {
            Image(systemName: "minus.circle.fill").font(.system(size: 22))
            VStack(alignment: .leading, spacing: 1) {
                Text("Kesh").font(.system(size: 13, weight: .semibold))
                Text("Новая трата").font(.system(size: 13))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(link("out"))
    }

    var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: "minus").font(.system(size: 20, weight: .bold))
        }
        .widgetURL(link("out"))
    }
}

struct KeshWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KeshWidget", provider: Provider()) { entry in
            WidgetBody()
                .containerBackground(for: .widget) { Backdrop(phase: entry.phase) }
        }
        .configurationDisplayName("Kesh")
        .description("Быстро добавить трату или открыть нужный экран")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct KeshWidgets: WidgetBundle {
    var body: some Widget { KeshWidget() }
}
