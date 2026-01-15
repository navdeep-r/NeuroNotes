import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { AppProvider } from '../../context/AppContext'
import Sidebar from './Sidebar'

// Helper to capture current location
let currentLocation: string = ''
function LocationCapture() {
  const location = useLocation()
  currentLocation = location.pathname
  return null
}

const renderSidebar = () => {
  return render(
    <BrowserRouter>
      <AppProvider>
        <LocationCapture />
        <Sidebar />
      </AppProvider>
    </BrowserRouter>
  )
}

/**
 * Tests for Sidebar navigation
 * Feature: neuronotes-frontend, Property 1, 2, 3, 5
 * Validates: Requirements 2.2, 2.3, 2.5, 3.5
 */
describe('Sidebar Navigation Properties', () => {
  it('Property 1: Clicking navigation items should route correctly', () => {
    renderSidebar()
    
    const navItems = [
      { id: 'dashboard', route: '/dashboard' },
      { id: 'live', route: '/live' },
      { id: 'history', route: '/history' },
      { id: 'visuals', route: '/visuals' },
      { id: 'insights', route: '/insights' },
      { id: 'settings', route: '/settings' },
    ]

    navItems.forEach(({ id, route }) => {
      const navButton = screen.getByTestId(`nav-${id}`)
      fireEvent.click(navButton)
      expect(currentLocation).toBe(route)
    })
  })

  it('Property 2: Active navigation item should have active styling', () => {
    renderSidebar()
    
    // Click on dashboard
    const dashboardNav = screen.getByTestId('nav-dashboard')
    fireEvent.click(dashboardNav)
    
    // Dashboard should be active
    expect(dashboardNav).toHaveAttribute('data-active', 'true')
    
    // Other items should not be active
    expect(screen.getByTestId('nav-live')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('nav-history')).toHaveAttribute('data-active', 'false')
  })

  it('Should display all navigation items', () => {
    renderSidebar()
    
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('nav-live')).toBeInTheDocument()
    expect(screen.getByTestId('nav-history')).toBeInTheDocument()
    expect(screen.getByTestId('nav-visuals')).toBeInTheDocument()
    expect(screen.getByTestId('nav-insights')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  it('Should display meeting list', () => {
    renderSidebar()
    
    expect(screen.getByTestId('meeting-list')).toBeInTheDocument()
  })
})
