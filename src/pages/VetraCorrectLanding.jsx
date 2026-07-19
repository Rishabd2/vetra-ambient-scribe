import { useEffect, useRef } from 'react'
import sourceHtml from './vetra-correct-v3.html?raw'
import sourceCss from './vetra-correct-v3.css?raw'

const journeyScripts = [
  [
    { type: 'system', text: 'Incoming · 2:14 AM · first ring' },
    { type: 'vetra', text: 'Maple Street Veterinary, this is Vetra. How can I help you and your pet tonight?' },
    { type: 'caller', text: "Hi — my dog Buddy has been limping since last night, he won't put weight on his back leg…" },
  ],
  [
    { type: 'vetra', text: "I'm sorry to hear that. A few quick questions — how old is Buddy, and is there any swelling you can see?" },
    { type: 'caller', text: "He's four. There's some swelling near the knee." },
    { type: 'system', text: 'Urgency: URGENT — same-day recommended' },
  ],
  [
    { type: 'vetra', text: 'Dr. Patel has an opening tomorrow at 9:40 AM. Should I book Buddy in?' },
    { type: 'caller', text: 'Yes, please — thank you so much.' },
    { type: 'system', text: 'Booked · confirmation sent by SMS' },
  ],
  [
    { type: 'system', text: 'Record created · written to PIMS' },
    { type: 'system', text: 'Patient: Buddy · 4yr Golden Retriever' },
    { type: 'system', text: 'Complaint: hind-limb lameness, swelling · Urgency: urgent · Action: booked 9:40 AM Dr. Patel' },
  ],
]

const journeyStatus = [
  'Incoming call · Maple St. Veterinary',
  'Triage in progress',
  'Booking · Dr. Patel, 9:40 AM',
  'Call complete · record written',
]

const agentChats = [
  [
    { type: 'caller', text: '"Do you have anything today? Milo ate something he shouldn\'t have."' },
    { type: 'vetra', text: '"Let me check what he got into — and yes, I can see a 3:20 slot."' },
    { type: 'system', text: 'Triage: urgent · booked 3:20 PM' },
  ],
  [
    { type: 'caller', text: '"I need a refill on Bella\'s Rimadyl, we\'re nearly out."' },
    { type: 'vetra', text: '"Bella has one refill left on file. I\'ll queue it for Dr. Kim\'s sign-off — pickup after 2 PM work?"' },
    { type: 'system', text: 'Refill queued · pending doctor approval' },
  ],
  [
    { type: 'caller', text: '"We think it might be time for Scout. I can barely say it out loud."' },
    { type: 'vetra', text: '"Take all the time you need. There\'s no rush on this call. When you\'re ready, I can hold a quiet hour on Thursday morning."' },
    { type: 'system', text: 'Quiet-hour hold · Thursday 9 AM' },
  ],
  [
    { type: 'system', text: 'Lab results in · Luna · bloodwork flagged' },
    { type: 'vetra', text: '"Hi, this is Vetra from Maple Street Vet — Dr. Patel asked us to schedule a recheck for Luna to go over her results."' },
    { type: 'system', text: 'Recheck booked · chart prepped for DVM' },
  ],
]

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Schibsted+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap');"

function addChatLines(host, lines, reducedMotion) {
  if (!host) return
  host.replaceChildren()
  lines.forEach((line, index) => {
    const item = document.createElement('div')
    item.className = `phone-line ${line.type}`
    item.textContent = line.text
    item.style.animationDelay = reducedMotion ? '0s' : `${index * 0.35}s`
    host.appendChild(item)
  })
}

export default function VetraCorrectLanding() {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const previousTitle = document.title
    const parsed = new DOMParser().parseFromString(sourceHtml, 'text/html')
    parsed.querySelectorAll('script').forEach((script) => script.remove())

    const style = document.createElement('style')
    style.dataset.vetraCorrectV3 = 'true'
    style.textContent = `${FONT_IMPORT}\n${sourceCss}`
    root.appendChild(style)

    const content = document.createElement('div')
    content.className = 'vetra-correct-v3'
    content.innerHTML = parsed.body.innerHTML
    root.appendChild(content)

    document.title = 'Vetra — Your practice, on autopilot'
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cleanups = []
    const observers = []
    let agentTimer = null

    const listen = (element, event, handler) => {
      if (!element) return
      element.addEventListener(event, handler)
      cleanups.push(() => element.removeEventListener(event, handler))
    }

    const burger = root.querySelector('#navBurger')
    const navLinks = root.querySelector('#navLinks')
    listen(burger, 'click', () => {
      const open = navLinks?.classList.toggle('open') || false
      burger.setAttribute('aria-expanded', String(open))
    })
    listen(navLinks, 'click', (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        navLinks.classList.remove('open')
        burger?.setAttribute('aria-expanded', 'false')
      }
    })

    const reveals = [...root.querySelectorAll('.reveal')]
    if ('IntersectionObserver' in window && !reducedMotion) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
      reveals.forEach((element) => observer.observe(element))
      observers.push(observer)
    } else {
      reveals.forEach((element) => element.classList.add('in'))
    }

    const animateCount = (element) => {
      const target = Number.parseInt(element.dataset.count || '0', 10)
      const prefix = element.dataset.prefix || ''
      const suffix = element.dataset.suffix || ''
      if (reducedMotion) {
        element.textContent = `${prefix}${target.toLocaleString()}${suffix}`
        return
      }
      const start = performance.now()
      const tick = (now) => {
        const progress = Math.min((now - start) / 1400, 1)
        const eased = 1 - ((1 - progress) ** 3)
        element.textContent = `${prefix}${Math.round(target * eased).toLocaleString()}${suffix}`
        if (progress < 1 && root.isConnected) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const counters = [...root.querySelectorAll('.proof-num')]
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target)
            observer.unobserve(entry.target)
          }
        })
      }, { threshold: 0.5 })
      counters.forEach((element) => observer.observe(element))
      observers.push(observer)
    } else {
      counters.forEach(animateCount)
    }

    const phoneBody = root.querySelector('#phoneBody')
    const phoneStatus = root.querySelector('#phoneStatus')
    const journeySteps = [...root.querySelectorAll('.j-step')]
    let activeJourney = -1
    const renderJourney = (index) => {
      if (index === activeJourney || !phoneBody) return
      activeJourney = index
      journeySteps.forEach((step) => step.classList.toggle('is-active', Number(step.dataset.step) === index))
      if (phoneStatus) phoneStatus.textContent = journeyStatus[index]
      addChatLines(phoneBody, journeyScripts[index], reducedMotion)
    }
    if (journeySteps.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) renderJourney(Number(entry.target.dataset.step))
        })
      }, { threshold: 0.6, rootMargin: '-20% 0px -30% 0px' })
      journeySteps.forEach((step) => observer.observe(step))
      observers.push(observer)
    }
    renderJourney(0)

    const agentTabs = [...root.querySelectorAll('.agent-tab')]
    const agentPanels = [...root.querySelectorAll('.agent-panel')]
    const stopAgentRotation = () => {
      if (agentTimer) window.clearInterval(agentTimer)
      agentTimer = null
    }
    const selectAgent = (index, focus = false) => {
      agentTabs.forEach((tab, tabIndex) => {
        const active = tabIndex === index
        tab.classList.toggle('is-active', active)
        tab.setAttribute('aria-selected', String(active))
        if (active && focus) tab.focus()
      })
      agentPanels.forEach((panel, panelIndex) => {
        const active = panelIndex === index
        panel.hidden = !active
        panel.classList.toggle('is-active', active)
        if (active) addChatLines(panel.querySelector('.chat-vignette'), agentChats[index], reducedMotion)
      })
    }
    agentTabs.forEach((tab, index) => {
      listen(tab, 'click', () => { stopAgentRotation(); selectAgent(index) })
      listen(tab, 'keydown', (event) => {
        const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (!direction) return
        event.preventDefault()
        stopAgentRotation()
        selectAgent((index + direction + agentTabs.length) % agentTabs.length, true)
      })
    })
    selectAgent(0)

    const team = root.querySelector('#team')
    if (team && agentTabs.length && !reducedMotion && 'IntersectionObserver' in window) {
      let rotationIndex = 0
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !agentTimer) {
            agentTimer = window.setInterval(() => {
              rotationIndex = (rotationIndex + 1) % agentTabs.length
              selectAgent(rotationIndex)
            }, 6000)
          } else if (!entry.isIntersecting) {
            stopAgentRotation()
          }
        })
      }, { threshold: 0.3 })
      observer.observe(team)
      observers.push(observer)
    }

    const inputs = ['inCalls', 'inMissed', 'inConv', 'inValue'].map((id) => root.querySelector(`#${id}`))
    const calculate = () => {
      if (inputs.some((input) => !input)) return
      const [callsInput, missedInput, conversionInput, valueInput] = inputs
      const calls = Number(callsInput.value)
      const missedRate = Number(missedInput.value) / 100
      const conversionRate = Number(conversionInput.value) / 100
      const caseValue = Number(valueInput.value)
      const missed = calls * missedRate
      const booked = missed * conversionRate
      const monthly = booked * caseValue
      const setText = (id, text) => { const element = root.querySelector(`#${id}`); if (element) element.textContent = text }
      const money = (number) => `$${Math.round(number).toLocaleString()}`
      setText('outCalls', calls.toLocaleString())
      setText('outMissed', `${missedInput.value}%`)
      setText('outConv', `${conversionInput.value}%`)
      setText('outValue', `$${Number(valueInput.value).toLocaleString()}`)
      setText('calcMissedN', Math.round(missed).toLocaleString())
      setText('calcBookedN', Math.round(booked).toLocaleString())
      setText('calcMonthly', money(monthly))
      setText('calcAnnual', money(monthly * 12))
    }
    inputs.forEach((input) => listen(input, 'input', calculate))
    calculate()

    return () => {
      stopAgentRotation()
      observers.forEach((observer) => observer.disconnect())
      cleanups.forEach((cleanup) => cleanup())
      root.replaceChildren()
      document.title = previousTitle
    }
  }, [])

  return <div ref={rootRef} />
}
