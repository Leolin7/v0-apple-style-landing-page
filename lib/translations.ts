export type Language = "en" | "zh"

export const translations = {
  en: {
    // Counter line
    
    // Hero
    heroLine1: "Let the world move.",
    heroLine2: "Stay with yourself.",

    // Hero sub-line
    heroSubline1: "A quiet exit from the noise.",
    heroSubline2: "A while that belongs to you.",

    // Counter label - companionship under the number (no number, it annotates the count above)
    counterLabel: "chose to stay",
    
    // CTA
    ctaButton: "Make it yours",
    signIn: "Sign in",
    
    // Time selection
    timeQuestion: "There’s no rush. You can choose to —",
    minutes15: "15 minutes",
    minutes30: "30 minutes", 
    minutes60: "60 minutes",

    // Quiet time choices
    choiceMoment: "stay for a moment",
    choiceWhile: "stay for a while",
    choiceLonger: "or, stay longer",
    durationShort: "15 min",
    durationMid: "30 min",
    durationLong: "60 min",

    // Closing line
    
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
    timerTitle: "This time is yours",
    timerMessages: {
      shortVideos: "Don't look for stimulation. Stay with the time.",
      messages: "Not everything needs you right now.",
      work: "Step out of the work-mind for a while.",
      ai: "Leave the question open.",
      anxiety: "You don't need to solve everything in this block.",
      boredom: "Boredom is not failure.",
      world: "Let the world move. Stay with yourself.",
    },
    pulledAway: "I drifted",
    finish: "Finish",
    
    // Completion
    completionPrefix: "This was your",
    savePrompt: "Save your time",
    createMySpace: "Create My Space",
    later: "Later",
    
    // My Space
    mySpace: "My Space",
    mySpaceSubline: "The time you made yours.",
    enterMySpace: "Enter My Space",
    madeYours: "made yours",
    blocksCompleted: "blocks completed",
    mostPulledAwayBy: "Most often pulled away by",
    recentMoments: "Recent moments",
    
    // Auth
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
    enterButton: "Enter",
    createMySpaceButton: "Create My Space",
    noSpace: "No space yet?",
    haveSpace: "Have a space?",
    signOut: "Sign out",
    
    // Validation
    emailRequired: "Email is required",
    emailInvalid: "Please enter a valid email",
    passwordRequired: "Password is required",
    passwordTooShort: "Password must be at least 8 characters",
    passwordsMustMatch: "Passwords must match",
    
    // Auth success/error
    checkYourEmail: "Check your email",
    signUpFailed: "Failed to create account. Please try again.",
    invalidCredentials: "Email or password is incorrect.",
    emailNotConfirmed: "Please verify your email first.",
    signInFailed: "Failed to sign in. Please try again.",
    comingSoon: "Coming soon",
    
    // Future features
    futureTitle: "Personal modes are coming",
    futureSubcopy: "Soon, Stay Alone will learn what helps you return to your own time.",
    
    // Save messages
    savedToMySpace: "Saved to My Space",
    couldNotSave: "Could not save to My Space",
    
    // Misc
    back: "Back",
    close: "Close",
    noSessions: "No sessions yet",
    block: "block",
    blocks: "blocks",
    or: "or",
  },
  zh: {
    // Counter line
    
    // Hero
    heroLine1: "让世界继续向前",
    heroLine2: "你回到自己",

    // Hero sub-line
    heroSubline1: "给自己一段只属于你的时间",
    heroSubline2: "",

    // Counter label - companionship under the number (no number, it annotates the count above)
    counterLabel: "把时间留给了自己",
    
    // CTA
    ctaButton: "开始",
    signIn: "登录",
    
    // Time selection
    timeQuestion: "这一次，你可以选择 —",
    minutes15: "15 分钟",
    minutes30: "30 分钟",
    minutes60: "60 分钟",

    // Quiet time choices
    choiceMoment: "休息片刻",
    choiceWhile: "留一会儿",
    choiceLonger: "或者，再久一点",
    durationShort: "15 分钟",
    durationMid: "30 分钟",
    durationLong: "60 分钟",

    // Closing line
    
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
    timerTitle: "这段时间属于你",
    timerMessages: {
      shortVideos: "不追刺激，留在这段时间里。",
      messages: "此刻，不是所有事都需要你。",
      work: "暂时离开工作的节奏。",
      ai: "让问题先空着。",
      anxiety: "这一段里，不必解决所有事。",
      boredom: "无聊不是失败。",
      world: "让世界继续。你回到自己。",
    },
    pulledAway: "分心了一下",
    finish: "结束",
    
    // Completion
    completionPrefix: "这是属于你的",
    savePrompt: "保存你的时间",
    createMySpace: "创建我的空间",
    later: "稍后",
    
    // My Space
    mySpace: "我的空间",
    mySpaceSubline: "你留给自己的时间。",
    enterMySpace: "进入我的空间",
    madeYours: "属于你",
    blocksCompleted: "次",
    mostPulledAwayBy: "最常被",
    mostPulledAwayBySuffix: "带走",
    recentMoments: "最近的时间",
    
    // Auth
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    continueWithGoogle: "使用 Google 继续",
    continueWithApple: "使用 Apple 继续",
    enterButton: "进入",
    createMySpaceButton: "创建我的空间",
    noSpace: "还没有空间？",
    haveSpace: "已有空间？",
    signOut: "退出登录",
    
    // Validation
    emailRequired: "请输入邮箱",
    emailInvalid: "请输入有效的邮箱地址",
    passwordRequired: "请输入密码",
    passwordTooShort: "密码至少需要 8 个字符",
    passwordsMustMatch: "两次密码不一致",
    
    // Auth success/error
    checkYourEmail: "查看你的邮箱",
    signUpFailed: "创建账号失败，请重试。",
    invalidCredentials: "邮箱或密码不正确。",
    emailNotConfirmed: "请先验证你的邮箱。",
    signInFailed: "登录失败，请重试。",
    comingSoon: "即将推出",
    
    // Future features
    futureTitle: "属于你的模式，即将开放",
    futureSubcopy: "之后，Stay Alone 会更懂你如何回到自己的时间。",
    
    // Save messages
    savedToMySpace: "已保存到我的空间",
    couldNotSave: "暂时无法保存到我的空间",
    
    // Misc
    back: "返回",
    close: "关闭",
    noSessions: "暂无记录",
    block: "次",
    blocks: "次",
    or: "或",
  },
} as const

export function getOrdinal(n: number, lang: Language): string {
  if (lang === "zh") {
    return `${n.toLocaleString()}`
  }
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n.toLocaleString()}${s[(v - 20) % 10] || s[v] || s[0]} `
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

// Format elapsed duration with seconds precision
export function formatElapsedDuration(totalSeconds: number, lang: Language): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (lang === "en") {
    // Under 1 minute: show seconds only
    if (hours === 0 && minutes === 0) {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`
    }
    // Under 1 hour
    if (hours === 0) {
      if (seconds === 0) {
        return `${minutes} minute${minutes !== 1 ? "s" : ""}`
      }
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""}`
    }
    // 1 hour or more
    if (minutes === 0 && seconds === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`
    }
    if (seconds === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${seconds !== 1 ? "s" : ""}`
  }

  // Chinese
  // Under 1 minute: show seconds only
  if (hours === 0 && minutes === 0) {
    return `${seconds} 秒`
  }
  // Under 1 hour
  if (hours === 0) {
    if (seconds === 0) {
      return `${minutes} 分钟`
    }
    return `${minutes} 分 ${seconds} 秒`
  }
  // 1 hour or more
  if (minutes === 0 && seconds === 0) {
    return `${hours} 小时`
  }
  if (seconds === 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }
  return `${hours} 小时 ${minutes} 分 ${seconds} 秒`
}
