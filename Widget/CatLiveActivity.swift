import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct CatWidgetBundle: WidgetBundle {
    var body: some Widget { CatLiveActivity() }
}

private func mood(_ context: ActivityViewContext<CatAttributes>) -> Mood {
    context.isStale && context.state.mood != .sleep ? .hungry : context.state.mood
}

struct CatLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CatAttributes.self) { context in
            HStack(spacing: 14) {
                IslandCat(context: context).frame(width: 58, height: 49)
                VStack(alignment: .leading, spacing: 8) {
                    NameLine(context: context)
                    HungerBar(state: context.state)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Buttons(size: 36)
            }
            .padding(16)
            .foregroundStyle(.white)
            .activityBackgroundTint(.black)
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IslandCat(context: context).frame(width: 76, height: 64)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.attributes.name).font(.system(.headline, design: .monospaced))
                            .lineLimit(1).minimumScaleFactor(0.6)
                        Text(mood(context).text.uppercased())
                            .lineLimit(1).minimumScaleFactor(0.7)
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 8)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .bottom, spacing: 12) {
                        HungerBar(state: context.state)
                        Buttons()
                    }
                }
            } compactLeading: {
                IslandCat(context: context).frame(width: 30, height: 26)
            } compactTrailing: {
                ProgressView(
                    timerInterval: context.state.fedAt...context.state.hungryAt,
                    countsDown: true,
                    label: { EmptyView() },
                    currentValueLabel: { EmptyView() }
                )
                .progressViewStyle(.circular)
                .tint(.white)
                .frame(width: 18, height: 18)
            } minimal: {
                IslandCat(context: context).frame(width: 24, height: 20)
            }
            .keylineTint(.white)
        }
    }
}

struct IslandCat: View {
    let context: ActivityViewContext<CatAttributes>

    var body: some View {
        let m = mood(context)
        CatView(mood: m, black: context.state.black)
            .id(m)
            .transition(.opacity)
    }
}

struct NameLine: View {
    let context: ActivityViewContext<CatAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.name).font(.system(.headline, design: .monospaced))
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(mood(context).text.uppercased())
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

// Тает сама, без обновлений Live Activity.
struct HungerBar: View {
    let state: CatAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("СЫТОСТЬ")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            ProgressView(
                timerInterval: state.fedAt...state.hungryAt,
                countsDown: true,
                label: { EmptyView() },
                currentValueLabel: { EmptyView() }
            )
            .tint(.white)
        }
    }
}

struct Buttons: View {
    var size: CGFloat = 40

    var body: some View {
        HStack(spacing: 8) {
            Button(intent: FeedIntent()) { icon("fork.knife") }
            Button(intent: PetIntent()) { icon("hand.raised.fill") }
            Button(intent: SleepIntent()) { icon("moon.zzz.fill") }
        }
        .buttonStyle(.plain)
    }

    private func icon(_ name: String) -> some View {
        Image(systemName: name)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(Color(white: 0.18)))
    }
}
