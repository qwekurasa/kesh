import ActivityKit
import SwiftUI

@main
struct CatIslandApp: App {
    init() {
        let d = UserDefaults.standard
        for key in [PetKeys.bornAt, PetKeys.fedAt, PetKeys.cleanedAt, PetKeys.sleptAt, PetKeys.playedAt]
        where d.object(forKey: key) == nil {
            Pet.touch(key)
        }
    }

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

enum Stat: CaseIterable, Identifiable {
    case hunger, hygiene, energy, happy
    var id: Self { self }

    var title: String {
        switch self {
        case .hunger: "СЫТОСТЬ"
        case .hygiene: "ЧИСТОТА"
        case .energy: "ЭНЕРГИЯ"
        case .happy: "НАСТРОЕНИЕ"
        }
    }

    var key: String {
        switch self {
        case .hunger: PetKeys.fedAt
        case .hygiene: PetKeys.cleanedAt
        case .energy: PetKeys.sleptAt
        case .happy: PetKeys.playedAt
        }
    }

    var span: TimeInterval {
        switch self {
        case .hunger: Pet.hungerSpan
        case .hygiene: 8 * 3600
        case .energy: 6 * 3600
        case .happy: 3 * 3600
        }
    }

    func level(at now: Date) -> Double {
        let t = UserDefaults.standard.double(forKey: key)
        return max(0, min(1, 1 - (now.timeIntervalSince1970 - t) / span))
    }
}

struct ContentView: View {
    @AppStorage(PetKeys.name) private var name = "Мурзик"
    @AppStorage(PetKeys.black) private var black = false
    @AppStorage(PetKeys.bornAt) private var bornAt = Date.now.timeIntervalSince1970
    @AppStorage(PetKeys.fedAt) private var fedAt = Date.now.timeIntervalSince1970

    @State private var reaction: Mood?
    @State private var inIsland = !Activity<CatAttributes>.activities.isEmpty
    @State private var showSettings = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            TimelineView(.periodic(from: .now, by: 30)) { tl in
                let now = tl.date
                ScrollView {
                    VStack(spacing: 18) {
                        header(now)
                        hero(now)
                        islandCard
                        if let error {
                            Text(error).font(.footnote).foregroundStyle(.secondary)
                        }
                        stats(now)
                        actions
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "slider.horizontal.3") }
                        .accessibilityLabel("Настройки")
                }
            }
            .sheet(isPresented: $showSettings, onDismiss: restartIfRunning) {
                SettingsView(name: $name, black: $black, onReset: reset)
                    .presentationDetents([.medium])
            }
        }
        .tint(.primary)
        .fontDesign(.monospaced)
    }

    // MARK: Секции

    private func header(_ now: Date) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text(name.uppercased()).font(.largeTitle.weight(.bold))
                Text("ВОЗРАСТ · \(age(now))").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text(mood(now).text.uppercased())
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10).padding(.vertical, 6)
                .overlay(Capsule().stroke(Color.primary, lineWidth: 1))
        }
        .padding(.top, 4)
    }

    private func hero(_ now: Date) -> some View {
        ZStack {
            Color(white: 0.42)
            DotGrid().foregroundStyle(.white.opacity(0.1))
            AnimatedCat(mood: mood(now), black: black)
                .frame(width: 210, height: 176)
                .offset(y: 30)
        }
        .frame(height: 250)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .onTapGesture { react(.love) }
    }

    private var islandCard: some View {
        Button {
            Task { inIsland ? await stopIsland() : startIsland() }
        } label: {
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(inIsland ? "КОТ В ОСТРОВКЕ" : "ПОСЕЛИТЬ В ОСТРОВОК").font(.headline)
                    Text(inIsland ? "Нажми, чтобы забрать обратно" : "Кот будет жить возле камеры")
                        .font(.caption).opacity(0.65)
                }
                Spacer()
                ZStack(alignment: .leading) {
                    Capsule().fill(.black).frame(width: 74, height: 26)
                        .overlay(Capsule().stroke(.white.opacity(0.35), lineWidth: 1))
                    if inIsland {
                        CatView(mood: .idle, black: false).frame(width: 22, height: 19).padding(.leading, 8)
                        Circle().fill(.white).frame(width: 6, height: 6).padding(.leading, 58)
                    }
                }
            }
            .padding(18)
            .foregroundStyle(Color(.systemBackground))
            .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.primary))
        }
        .buttonStyle(.plain)
    }

    private func stats(_ now: Date) -> some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], spacing: 14) {
            ForEach(Stat.allCases) { stat in
                VStack(alignment: .leading, spacing: 6) {
                    Text(stat.title).font(.caption2.weight(.semibold)).tracking(1)
                    let filled = Int((stat.level(at: now) * 10).rounded(.up))
                    HStack(spacing: 3) {
                        ForEach(0..<10, id: \.self) { i in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(i < filled ? Color.primary : Color.primary.opacity(0.12))
                                .frame(height: 9)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(Color.primary.opacity(0.15), lineWidth: 1))
    }

    private var actions: some View {
        HStack {
            action("fork.knife", "ЕДА") { Pet.touch(PetKeys.fedAt); react(.happy) }
            action("drop", "МЫТЬ") { Pet.touch(PetKeys.cleanedAt); react(.surprised) }
            action("tennisball", "ИГРА") { Pet.touch(PetKeys.playedAt); react(.love) }
            action("moon.zzz", "СОН") { Pet.touch(PetKeys.sleptAt); react(.sleep, for: 4) }
        }
    }

    private func action(_ icon: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title3)
                    .frame(width: 62, height: 62)
                    .overlay(Circle().stroke(Color.primary, lineWidth: 1.5))
                Text(label).font(.caption2.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    // MARK: Логика

    private func baseMood(_ now: Date) -> Mood {
        if Stat.energy.level(at: now) < 0.15 { return .sleep }
        if Stat.hunger.level(at: now) < 0.2 { return .hungry }
        if Stat.happy.level(at: now) < 0.25 || Stat.hygiene.level(at: now) < 0.2 { return .sad }
        return .idle
    }

    private func mood(_ now: Date) -> Mood { reaction ?? baseMood(now) }

    private func age(_ now: Date) -> String {
        let m = Int(now.timeIntervalSince1970 - bornAt) / 60
        return m < 60 * 24 ? "\(m / 60) Ч \(m % 60) МИН" : "\(m / 1440) Д \(m / 60 % 24) Ч"
    }

    private func react(_ mood: Mood, for seconds: Double = 2.5) {
        withAnimation(.snappy) { reaction = mood }
        Task {
            await sync(mood)
            try? await Task.sleep(for: .seconds(seconds))
            withAnimation(.snappy) { reaction = nil }
            await sync(baseMood(.now))
        }
    }

    private func state(_ mood: Mood) -> CatAttributes.ContentState {
        .init(mood: mood, black: black, fedAt: Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: PetKeys.fedAt)))
    }

    private func sync(_ mood: Mood) async {
        let s = state(mood)
        for a in Activity<CatAttributes>.activities {
            await a.update(.init(state: s, staleDate: s.hungryAt))
        }
    }

    private func startIsland() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            error = "Live Activities выключены: Настройки → Cat"
            return
        }
        let s = state(baseMood(.now))
        do {
            _ = try Activity.request(attributes: CatAttributes(name: name), content: .init(state: s, staleDate: s.hungryAt))
            inIsland = true
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func stopIsland() async {
        for a in Activity<CatAttributes>.activities {
            await a.end(nil, dismissalPolicy: .immediate)
        }
        inIsland = false
    }

    private func restartIfRunning() {
        guard inIsland else { return }
        Task {
            await stopIsland()
            startIsland()
        }
    }

    private func reset() {
        for key in [PetKeys.bornAt, PetKeys.fedAt, PetKeys.cleanedAt, PetKeys.sleptAt, PetKeys.playedAt] {
            Pet.touch(key)
        }
        react(.surprised)
    }
}

struct AnimatedCat: View {
    let mood: Mood
    let black: Bool
    @State private var blinking = false
    @State private var breathe = false

    var body: some View {
        CatView(mood: shown, black: black)
            .scaleEffect(x: 1, y: breathe ? 1.035 : 1, anchor: .bottom)
            .animation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true), value: breathe)
            .onAppear { breathe = true }
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(Double.random(in: 2.5...5)))
                    blinking = true
                    try? await Task.sleep(for: .milliseconds(140))
                    blinking = false
                }
            }
    }

    private var shown: Mood {
        blinking && [.idle, .hungry, .surprised, .sad].contains(mood) ? .blink : mood
    }
}

struct DotGrid: View {
    var body: some View {
        Canvas { ctx, size in
            var p = Path()
            stride(from: 6.0, to: size.width, by: 10).forEach { x in
                stride(from: 6.0, to: size.height, by: 10).forEach { y in
                    p.addRect(CGRect(x: x, y: y, width: 3, height: 3))
                }
            }
            ctx.fill(p, with: .foreground)
        }
    }
}

struct SettingsView: View {
    @Binding var name: String
    @Binding var black: Bool
    let onReset: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("ИМЯ") {
                    TextField("Имя", text: $name)
                }
                Section("ОКРАС") {
                    HStack(spacing: 12) {
                        swatch(false, "БЕЛЫЙ")
                        swatch(true, "ЧЁРНЫЙ")
                    }
                    .padding(.vertical, 4)
                }
                Section {
                    Button("Завести заново", role: .destructive) { onReset(); dismiss() }
                }
            }
            .navigationTitle("Питомец")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } }
            }
        }
        .fontDesign(.monospaced)
    }

    private func swatch(_ value: Bool, _ label: String) -> some View {
        Button { black = value } label: {
            VStack(spacing: 8) {
                CatView(mood: .idle, black: value)
                    .frame(width: 70, height: 59)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color(white: 0.42)))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.primary, lineWidth: black == value ? 2.5 : 0))
                Text(label).font(.caption.weight(.semibold))
            }
        }
        .buttonStyle(.plain)
    }
}
