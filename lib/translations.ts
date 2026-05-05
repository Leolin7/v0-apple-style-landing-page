export type Language = "en" | "zh"

export const translations = {
  en: {
    // Counter line
    counterLine: "soul chooses—",
    counterPrefix: "The",
    counterSuffix: "soul chooses—",
    
    // Hero
    heroLine1: "Let the world move.",
    heroLine2: "Stay with yourself.",
    
    // CTA
    ctaButton: "Make it yours",
    signIn: "Sign in",
    
    // Time selection
    timeQuestion: "How much time do you want to make yours?",
    minutes15: "15 minutes",
    minutes30: "30 minutes", 
    minutes60: "60 minutes",
    
    // Trigger selection
    triggerQuestion: "What are you stepping away from?",
    triggers: {
      shortVideos: "Short videos",
      messages: "Messages",
      work: "Work",
      ai: "AI and endless searching",
      anxiety: "Anxiety",
      boredom: "Boredom",
      world: "The world for a while",
    },
    
    // Timer
    timerTitle: "This time is yours.",
    timerMessages: {
      shortVideos: "Don't look for stimulation. Stay with the time.",
      messages: "Not everything needs you right now.",
      work: "Step out of the work-mind for a while.",
      ai: "Leave the question open.",
      anxiety: "You don't need to solve everything in this block.",
      boredom: "Boredom is not failure.",
      world: "Let the world move. Stay with yourself.",
    },
    pulledAway: "I was pulled away",
    finish: "Finish",
    
    // Completion
    completionTitle: "You made this time yours.",
    today: "Today",
    thisWeek: "This week",
    
    // Account prompt
    savePrompt: "Save your time.",
    createAccount: "Create account",
    continueWithout: "Continue without account",
    
    // Account / My Time
    myTime: "My Time",
    timeMadeYours: "Time made yours",
    completedBlocks: "Completed blocks",
    whatPullsYou: "What pulls you away",
    recentSessions: "Recent sessions",
    
    // Future features
    futureTitle: "Personal Stay Alone modes are coming.",
    futureSubcopy: "Soon, Stay Alone will learn what helps you return to your own time.",
    
    // Misc
    back: "Back",
    close: "Close",
    noSessions: "No sessions yet",
    block: "block",
    blocks: "blocks",
  },
  zh: {
    // Counter line
    counterLine: "个灵魂，选择——",
    counterPrefix: "第",
    counterSuffix: "个灵魂，选择——",
    
    // Hero
    heroLine1: "让世界继续。",
    heroLine2: "你回到自己。",
    
    // CTA
    ctaButton: "开始",
    signIn: "登录",
    
    // Time selection
    timeQuestion: "你想把多久留给自己？",
    minutes15: "15 分钟",
    minutes30: "30 分钟",
    minutes60: "60 分钟",
    
    // Trigger selection
    triggerQuestion: "你想暂时离开什么？",
    triggers: {
      shortVideos: "短视频",
      messages: "消息",
      work: "工作",
      ai: "AI 和无尽搜索",
      anxiety: "焦虑",
      boredom: "无聊",
      world: "暂时离开世界一会儿",
    },
    
    // Timer
    timerTitle: "这段时间属于你。",
    timerMessages: {
      shortVideos: "不追刺激，留在这段时间里。",
      messages: "此刻，不是所有事都需要你。",
      work: "暂时离开工作的节奏。",
      ai: "让问题先空着。",
      anxiety: "这一段里，不必解决所有事。",
      boredom: "无聊不是失败。",
      world: "让世界继续。你回到自己。",
    },
    pulledAway: "我被带走了",
    finish: "结束",
    
    // Completion
    completionTitle: "这段时间，属于你了。",
    today: "今天",
    thisWeek: "本周",
    
    // Account prompt
    savePrompt: "保存你的时间。",
    createAccount: "创建账户",
    continueWithout: "暂不注册",
    
    // Account / My Time
    myTime: "我的时间",
    timeMadeYours: "属于你的时间",
    completedBlocks: "完成次数",
    whatPullsYou: "什么把你带走",
    recentSessions: "最近记录",
    
    // Future features
    futureTitle: "属于你的 Stay Alone 模式，即将开放。",
    futureSubcopy: "之后，Stay Alone 会更懂你如何回到自己的时间。",
    
    // Misc
    back: "返回",
    close: "关闭",
    noSessions: "暂无记录",
    block: "次",
    blocks: "次",
  },
} as const

export function getOrdinal(n: number, lang: Language): string {
  if (lang === "zh") {
    return `第 ${n.toLocaleString()} `
  }
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `The ${n.toLocaleString()}${s[(v - 20) % 10] || s[v] || s[0]} `
}

export function formatDuration(minutes: number, lang: Language): string {
  if (minutes < 60) {
    return lang === "en" ? `${minutes} minutes` : `${minutes} 分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (lang === "en") {
    if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`
    return `${hours} hour${hours > 1 ? "s" : ""} ${mins} minutes`
  }
  if (mins === 0) return `${hours} 小时`
  return `${hours} 小时 ${mins} 分钟`
}
