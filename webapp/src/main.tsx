import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDefaultsIfEmpty } from './db/db'
import { generateDueRecurring } from './db/recurringEngine'
import { removeBuddhistEraImports } from './db/transactionManager'

seedDefaultsIfEmpty()
  .then(() => removeBuddhistEraImports())
  .then(() => generateDueRecurring())
  .catch(() => {
    // generation failure must never block app startup
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
