import SwiftUI

struct CatView: View {
    var mood: Mood
    var black = false

    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width / 100, size.height / 84)
            ctx.translateBy(x: (size.width - 100 * s) / 2, y: (size.height - 84 * s) / 2)
            ctx.scaleBy(x: s, y: s)
            CatDrawing(mood: mood, black: black).draw(in: &ctx)
        }
        .aspectRatio(100 / 84, contentMode: .fit)
    }
}

private func P(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x, y: y) }

private func circle(_ c: CGPoint, _ r: Double) -> Path {
    Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
}

private struct CatDrawing {
    let mood: Mood
    let black: Bool

    var fur: Color { black ? .black : .white }
    var ink: Color { black ? .white : .black }
    var edge: Color { black ? Color(white: 0.38) : Color(white: 0.78) }
    let soft = Color(white: 0.58)
    let line = StrokeStyle(lineWidth: 2.6, lineCap: .round, lineJoin: .round)

    var head: Path {
        var p = Path()
        p.move(to: P(10, 80))
        p.addCurve(to: P(8, 38), control1: P(6, 66), control2: P(4, 50))
        p.addLine(to: P(13, 5))
        p.addLine(to: P(22, 15))
        p.addLine(to: P(25, 11))
        p.addLine(to: P(35, 22))
        p.addQuadCurve(to: P(44, 19), control: P(40, 18))
        p.addLine(to: P(47, 15))
        p.addLine(to: P(50, 19))
        p.addQuadCurve(to: P(65, 22), control: P(58, 17))
        p.addLine(to: P(75, 11))
        p.addLine(to: P(78, 15))
        p.addLine(to: P(87, 5))
        p.addCurve(to: P(92, 38), control1: P(91, 16), control2: P(91, 28))
        p.addLine(to: P(96, 42))
        p.addLine(to: P(92, 46))
        p.addCurve(to: P(90, 80), control1: P(95, 60), control2: P(93, 70))
        p.closeSubpath()
        return p
    }

    func draw(in ctx: inout GraphicsContext) {
        let h = head
        ctx.fill(h, with: .color(fur))
        if black { ctx.stroke(h, with: .color(edge), lineWidth: 1.5) }

        for x in [27.0, 55.0] {
            let paw = Path(roundedRect: CGRect(x: x, y: 70, width: 18, height: 12), cornerRadius: 6)
            ctx.fill(paw, with: .color(fur))
            ctx.stroke(paw, with: .color(edge), lineWidth: 1.2)
            var toes = Path()
            toes.move(to: P(x + 6, 76)); toes.addLine(to: P(x + 6, 81))
            toes.move(to: P(x + 12, 76)); toes.addLine(to: P(x + 12, 81))
            ctx.stroke(toes, with: .color(edge), lineWidth: 1)
        }

        drawEyes(&ctx)

        var nose = Path()
        nose.move(to: P(47.5, 53)); nose.addLine(to: P(52.5, 53)); nose.addLine(to: P(50, 56)); nose.closeSubpath()
        ctx.fill(nose, with: .color(soft))

        drawMouth(&ctx)

        if mood == .happy || mood == .love {
            ctx.fill(Path(ellipseIn: CGRect(x: 22, y: 54, width: 8, height: 4)), with: .color(soft.opacity(0.6)))
            ctx.fill(Path(ellipseIn: CGRect(x: 70, y: 54, width: 8, height: 4)), with: .color(soft.opacity(0.6)))
        }
        if mood == .love {
            var sp = Path()
            for c in [P(4, 24), P(96, 22), P(98, 58)] {
                sp.move(to: P(c.x - 3, c.y)); sp.addLine(to: P(c.x + 3, c.y))
                sp.move(to: P(c.x, c.y - 3)); sp.addLine(to: P(c.x, c.y + 3))
            }
            ctx.stroke(sp, with: .color(soft), lineWidth: 1.4)
        }
        if mood == .sleep {
            ctx.draw(Text("z").font(.system(size: 9, weight: .heavy, design: .rounded)).foregroundColor(soft), at: P(96, 30))
            ctx.draw(Text("Z").font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundColor(soft), at: P(99, 17))
        }
    }

    func openEye(_ ctx: inout GraphicsContext, _ c: CGPoint, r: Double) {
        ctx.fill(circle(c, r), with: .color(ink))
        if black {
            ctx.fill(circle(c, r * 0.5), with: .color(.black))
        } else {
            ctx.fill(circle(P(c.x + r * 0.3, c.y - r * 0.3), r * 0.32), with: .color(.white))
        }
    }

    func drawEyes(_ ctx: inout GraphicsContext) {
        let eyes = [P(36, 46), P(64, 46)]
        switch mood {
        case .idle, .hungry:
            eyes.forEach { openEye(&ctx, $0, r: 6.5) }
        case .lookLeft, .lookRight:
            let dx = mood == .lookLeft ? -3.5 : 3.5
            eyes.forEach { openEye(&ctx, P($0.x + dx, $0.y), r: 6.5) }
        case .surprised:
            eyes.forEach { openEye(&ctx, $0, r: 8) }
            var m = Path()
            m.move(to: P(17, 40)); m.addLine(to: P(21, 42))
            m.move(to: P(17, 52)); m.addLine(to: P(21, 50))
            m.move(to: P(83, 40)); m.addLine(to: P(79, 42))
            m.move(to: P(83, 52)); m.addLine(to: P(79, 50))
            ctx.stroke(m, with: .color(soft), style: line)
        case .sad:
            eyes.forEach { openEye(&ctx, $0, r: 5.5) }
            var b = Path()
            b.move(to: P(29, 37)); b.addLine(to: P(40, 34))
            b.move(to: P(60, 34)); b.addLine(to: P(71, 37))
            ctx.stroke(b, with: .color(ink), style: line)
            ctx.fill(Path(ellipseIn: CGRect(x: 65, y: 53, width: 3.5, height: 5.5)), with: .color(soft))
        case .blink:
            var p = Path()
            for c in eyes { p.move(to: P(c.x - 6, c.y)); p.addLine(to: P(c.x + 6, c.y)) }
            ctx.stroke(p, with: .color(ink), style: line)
        case .happy, .love:
            var p = Path()
            for c in eyes { p.move(to: P(c.x - 6, c.y + 2)); p.addQuadCurve(to: P(c.x + 6, c.y + 2), control: P(c.x, c.y - 6)) }
            ctx.stroke(p, with: .color(ink), style: line)
        case .sleep:
            var p = Path()
            for c in eyes { p.move(to: P(c.x - 6, c.y - 1)); p.addQuadCurve(to: P(c.x + 6, c.y - 1), control: P(c.x, c.y + 5)) }
            ctx.stroke(p, with: .color(ink), style: line)
        }
    }

    func drawMouth(_ ctx: inout GraphicsContext) {
        let thin = StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round)
        switch mood {
        case .hungry, .surprised:
            ctx.fill(Path(ellipseIn: CGRect(x: 47, y: 57, width: 6, height: 6)), with: .color(ink))
        case .sad:
            var p = Path()
            p.move(to: P(46, 61)); p.addQuadCurve(to: P(54, 61), control: P(50, 57))
            ctx.stroke(p, with: .color(ink), style: thin)
        default:
            var p = Path()
            p.move(to: P(45, 57)); p.addQuadCurve(to: P(50, 58), control: P(47.5, 60.5))
            p.addQuadCurve(to: P(55, 57), control: P(52.5, 60.5))
            ctx.stroke(p, with: .color(ink), style: thin)
        }
    }
}
