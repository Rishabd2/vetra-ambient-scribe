import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [localApiRoutes(), react(), tailwindcss()],
    server: {
      allowedHosts: [
        'tiffanie-photoconductive-frontally.ngrok-free.dev',
      ],
    },
  }
})

function localApiRoutes() {
  const routes = {
    '/api/ringg-calls': () => import('./api/ringg-calls.js'),
    '/api/ringg-webhook': () => import('./api/ringg-webhook.js'),
    '/api/cal/slots': () => import('./api/cal/slots.js'),
    '/api/cal/book-appointment': () => import('./api/book_appointment.js'),
    '/api/book_appointment': () => import('./api/book_appointment.js'),
    '/book_appointment': () => import('./api/book_appointment.js'),
    '/api/cal/cancel-appointment': () => import('./api/cancel_appointment.js'),
    '/api/cancel_appointment': () => import('./api/cancel_appointment.js'),
    '/cancel_appointment': () => import('./api/cancel_appointment.js'),
    '/api/cal/reschedule-appointment': () => import('./api/reschedule_appointment.js'),
    '/api/reschedule_appointment': () => import('./api/reschedule_appointment.js'),
    '/reschedule_appointment': () => import('./api/reschedule_appointment.js'),
    '/api/check_availability_of_slots': () => import('./api/check_availability_of_slots.js'),
    '/check_availability_of_slots': () => import('./api/check_availability_of_slots.js'),
    '/api/lookup_patient': () => import('./api/lookup_patient.js'),
    '/lookup_patient': () => import('./api/lookup_patient.js'),
    '/api/check_due_care': () => import('./api/check_due_care.js'),
    '/check_due_care': () => import('./api/check_due_care.js'),
    '/api/clinic_faq': () => import('./api/clinic_faq.js'),
    '/clinic_faq': () => import('./api/clinic_faq.js'),
    '/api/save_call_context': () => import('./api/save_call_context.js'),
    '/save_call_context': () => import('./api/save_call_context.js'),
    '/api/notify_emergency_team': () => import('./api/notify_emergency_team.js'),
    '/notify_emergency_team': () => import('./api/notify_emergency_team.js'),
    '/api/webhooks/call-completed': () => import('./api/ringg-webhook.js'),
    '/webhooks/call-completed': () => import('./api/ringg-webhook.js'),
  }

  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const loadRoute = routes[url.pathname]
        if (!loadRoute) {
          next()
          return
        }

        try {
          const mod = await loadRoute()
          await mod.default(
            {
              method: req.method,
              headers: req.headers,
              query: Object.fromEntries(url.searchParams.entries()),
              body: await readBody(req),
            },
            createLocalResponse(res),
          )
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Local API route failed',
          }))
        }
      })
    },
  }
}

function createLocalResponse(res) {
  return {
    statusCode: 200,
    setHeader: (key, value) => res.setHeader(key, value),
    status(code) {
      this.statusCode = code
      res.statusCode = code
      return this
    },
    json(payload) {
      res.statusCode = this.statusCode
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(payload))
    },
    end(payload = '') {
      res.statusCode = this.statusCode
      res.end(payload)
    },
  }
}

async function readBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method || '')) return undefined

  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw) return undefined

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
