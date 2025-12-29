import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../../context/AppContext'
import CommandBar from './CommandBar'

const renderCommandBar = () => {
  return render(
    <BrowserRouter>
      <AppProvider>
        <CommandBar />
      </AppProvider>
    </BrowserRouter>
  )
}

/**
 * Tests for CommandBar component
 * Feature: minuteflow-frontend, Property 11
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('CommandBar', () => {
  it('Should display input with correct placeholder', () => {
    renderCommandBar()
    
    const input = screen.getByTestId('command-input')
    expect(input).toHaveAttribute('placeholder', 'Ask MinuteFlow to create a chart or assign an action…')
  })

  it('Should display voice icon', () => {
    renderCommandBar()
    
    expect(screen.getByLabelText('Voice input')).toBeInTheDocument()
  })

  it('Should display keyboard shortcut hint', () => {
    renderCommandBar()
    
    expect(screen.getByText('K')).toBeInTheDocument()
  })

  it('Property 11: Should handle command input changes', () => {
    renderCommandBar()
    
    const input = screen.getByTestId('command-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'create a chart' } })
    
    expect(input.value).toBe('create a chart')
  })

  it('Should focus input on Ctrl+K', () => {
    renderCommandBar()
    
    const input = screen.getByTestId('command-input')
    
    // Simulate Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    
    expect(document.activeElement).toBe(input)
  })

  it('Property 11: Should clear input after command submission', () => {
    renderCommandBar()
    
    const input = screen.getByTestId('command-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'create a chart' } })
    
    // Submit form
    fireEvent.submit(input.closest('form')!)
    
    expect(input.value).toBe('')
  })
})
