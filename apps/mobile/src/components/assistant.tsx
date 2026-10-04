import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tap } from "@/components/app-ui";
import { greeting, topics, type AssistantAction, type Topic } from "@/lib/assistant";
import { colors, fonts, shadow } from "@/lib/theme";

type Message = { id: number; from: "bot" | "me"; text: string; action?: Topic["action"] };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// A small floating button that bobs gently and, the first time, shows an "Ask us" tag.
export function AssistantButton({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const [bob] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));
  const [tag] = useState(() => new Animated.Value(0));
  const [showTag, setShowTag] = useState(true);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(1600),
    ]));
    loop.start(); pulse.start();
    return () => { loop.stop(); pulse.stop(); };
  }, [reduced, bob, ring]);

  useEffect(() => {
    const show = Animated.sequence([
      Animated.delay(900),
      Animated.spring(tag, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(4200),
      Animated.timing(tag, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    show.start(({ finished }) => { if (finished) setShowTag(false); });
    return () => show.stop();
  }, [tag]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return (
    <View style={s.fabWrap} pointerEvents="box-none">
      {showTag && (
        <Animated.View style={[s.tag, { opacity: tag, transform: [{ translateX: tag.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: tag.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <Text style={s.tagText}>Questions? Ask us</Text>
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ translateY }] }}>
        {!reduced && <Animated.View pointerEvents="none" style={[s.ring, { opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} />}
        <Pressable onPress={() => { tap(); setShowTag(false); onPress(); }} accessibilityRole="button" accessibilityLabel="Open the Lawmedy assistant" style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.94 }] }]}>
          <MaterialIcons name="chat-bubble" size={24} color="#fff" />
          <View style={s.spark}><MaterialIcons name="auto-awesome" size={11} color={colors.ink} /></View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function TypingDots() {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    const anims = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.delay((2 - i) * 140 + 200),
    ])));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);
  return (
    <View style={[s.bubble, s.bot, { flexDirection: "row", gap: 5, paddingVertical: 14 }]} accessibilityLabel="Typing">
      {dots.map((d, i) => <Animated.View key={i} style={[s.dot, { opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]} />)}
    </View>
  );
}

function Bubble({ message, onAction }: { message: Message; onAction: (to: AssistantAction) => void }) {
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => { Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }).start(); }, [enter]);
  const mine = message.from === "me";
  return (
    <Animated.View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
      <View style={[s.bubble, mine ? s.me : s.bot]}>
        <Text style={[s.bubbleText, mine && { color: "#fff" }]}>{message.text}</Text>
      </View>
      {message.action && (
        <Pressable onPress={() => { tap(); onAction(message.action!.to); }} accessibilityRole="button" style={({ pressed }) => [s.actionBtn, pressed && { backgroundColor: colors.tint2 }]}>
          <Text style={s.actionText}>{message.action.label}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={colors.ink} />
        </Pressable>
      )}
    </Animated.View>
  );
}

// The chat panel. Answers are preset; they appear one bubble at a time after a short typing pause.
export function AssistantSheet({ visible, onClose, onAction, prices }: { visible: boolean; onClose: () => void; onAction: (to: AssistantAction) => void; prices: { notice: string; rti: string } }) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(visible);
  const [messages, setMessages] = useState<Message[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(1);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const say = useCallback((texts: string[], action?: Topic["action"]) => {
    setTyping(true);
    let at = 0;
    texts.forEach((text, i) => {
      at += Math.min(1500, 550 + text.length * 7);
      timers.current.push(setTimeout(() => {
        setMessages((m) => [...m, { id: nextId.current++, from: "bot", text, action: i === texts.length - 1 ? action : undefined }]);
        if (i === texts.length - 1) setTyping(false);
      }, at));
    });
  }, []);

  // Mount as soon as it is asked to open; unmount only after the closing animation has run.
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible) {
      Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 9, tension: 70 }).start();
      // Let the panel slide in before the greeting starts typing.
      if (messages.length === 0 && !typing) timers.current.push(setTimeout(() => say(greeting), 250));
    } else {
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimers(), []);
  useEffect(() => { const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60); return () => clearTimeout(t); }, [messages.length, typing]);

  const ask = (topic: Topic) => {
    if (typing) return;
    tap();
    setAsked((a) => [...a, topic.id]);
    setMessages((m) => [...m, { id: nextId.current++, from: "me", text: topic.question }]);
    say(topic.answer(prices), topic.action);
  };
  const restart = () => { clearTimers(); setTyping(false); setAsked([]); setMessages([]); say(greeting); };
  const suggestions = [...topics.filter((t) => !asked.includes(t.id)), ...topics.filter((t) => asked.includes(t.id))];

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the assistant" />
      </Animated.View>
      <Animated.View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }] }]}>
        <View style={s.grabber} />
        <View style={s.header}>
          <View style={s.avatar}><MaterialIcons name="auto-awesome" size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Lawmedy assistant</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={s.online} />
              <Text style={s.subtitle}>Quick answers from the Lawmedy team</Text>
            </View>
          </View>
          <Pressable onPress={restart} hitSlop={10} accessibilityRole="button" accessibilityLabel="Start over" style={s.iconBtn}><MaterialIcons name="refresh" size={20} color={colors.muted} /></Pressable>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={s.iconBtn}><MaterialIcons name="close" size={22} color={colors.ink} /></Pressable>
        </View>

        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {messages.map((m) => <Bubble key={m.id} message={m} onAction={onAction} />)}
          {typing && <TypingDots />}
        </ScrollView>

        <View style={s.suggestBar}>
          <Text style={s.suggestLabel}>{asked.length ? "Ask something else" : "Popular questions"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {suggestions.map((t) => {
              const done = asked.includes(t.id);
              return (
                <Pressable key={t.id} disabled={typing} onPress={() => ask(t)} accessibilityRole="button" style={({ pressed }) => [s.chip, done && s.chipDone, typing && { opacity: 0.5 }, pressed && { backgroundColor: colors.tint2 }]}>
                  <Text style={[s.chipText, done && { color: colors.muted }]}>{t.question}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => { tap(); onAction("contact"); }} accessibilityRole="button" style={({ pressed }) => [s.chip, pressed && { backgroundColor: colors.tint2 }]}>
              <Text style={s.chipText}>Talk to a person</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fabWrap: { position: "absolute", right: 16, bottom: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  ring: { position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink },
  spark: { position: "absolute", top: 13, right: 12, width: 15, height: 15, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  tag: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, ...shadow, shadowOpacity: 0.1 },
  tagText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink },
  backdrop: { backgroundColor: "rgba(28,27,26,0.35)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: "82%", backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  online: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ok },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bot: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderBottomLeftRadius: 6, alignSelf: "flex-start" },
  me: { backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  bubbleText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.ink, backgroundColor: colors.card },
  actionText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink },
  suggestBar: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.card, gap: 8 },
  suggestLabel: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.muted, paddingHorizontal: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, minHeight: 38, justifyContent: "center" },
  chipDone: { backgroundColor: colors.tint, borderColor: colors.tint },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink },
});

