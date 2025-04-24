import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/page'
import { Component } from './app/component'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <Component />
  </StrictMode>,
)
