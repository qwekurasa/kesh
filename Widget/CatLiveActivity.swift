import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct CatWidgetBundle: WidgetBundle {
    var body: some Widget { CatLiveActivity() }
}

struct CatLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CatAttributes.self) { context in
            // Экран блокировки
            HStack(spacing: 12) {
                CatFace(state: context.state, isStale: context.isStale, size: 44)
                VStack(alignment: .leading, spacing: 6) {
                    Text(context.attributes.name).font(.headline)
                    HungerBar(state: context.state)
                }
                Spacer()
                Buttons()
            }
            .padding()
            .activityBackgroundTint(.black)
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    CatFace(state: context.state, isStale: context.isStale, size: 52)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.attributes.name).font(.headline)
                        Text(mood(context).text).font(.caption).foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 10) {
                        HungerBar(state: context.state)
                        Buttons()
                    }
                }
            } compactLeading: {
                CatFace(state: context.state, isStale: context.isStale, size: 20)
            } compactTrailing: {
                ProgressView(
                    timerInterval: context.state.fedAt...context.state.hungryAt,
                    countsDown: true,
                    label: { EmptyView() },
                    currentValueLabel: { EmptyView() }
                )
                .progressViewStyle(.circular)
                .tint(.orange)
                .frame(width: 18, height: 18)
            } minimal: {
                CatFace(state: context.state, isStale: context.isStale, size: 18)
            }
            .keylineTint(.orange)
        }
    }

    private func mood(_ context: ActivityViewContext<CatAttributes>) -> Mood {
        context.isStale ? .hungry : context.state.mood
    }
}

// Когда наступает staleDate (кот проголодался), лицо меняется само.
struct CatFace: View {
    let state: CatAttributes.ContentState
    let isStale: Bool
    let size: CGFloat

    var body: some View {
        let mood = isStale ? Mood.hungry : state.mood
        Text(mood.face)
            .font(.system(size: size))
            .id(mood)
            .transition(.push(from: .bottom))
    }
}

// Тает в реальном времени без обновлений Live Activity.
struct HungerBar: View {
    let state: CatAttributes.ContentState

    var body: some View {
        ProgressView(
            timerInterval: state.fedAt...state.hungryAt,
            countsDown: true,
            label: { Text("Сытость").font(.caption2) },
            currentValueLabel: { EmptyView() }
        )
        .tint(.orange)
    }
}

struct Buttons: View {
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: FeedIntent()) { Label("Покормить", systemImage: "fish.fill") }
            Button(intent: PetIntent()) { Label("Погладить", systemImage: "hand.raised.fill") }
            Button(intent: SleepIntent()) { Label("Спать", systemImage: "moon.zzz.fill") }
        }
        .labelStyle(.iconOnly)
        .buttonStyle(.bordered)
        .tint(.orange)
    }
}
