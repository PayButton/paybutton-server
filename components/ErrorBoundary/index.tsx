import Error from 'next/error'
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface IProps {
  children: ReactNode
  error: Error
}

interface IState {
  hasError: boolean
}

class ErrorBoundary extends Component<IProps, IState> {
  constructor (props: IProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError (): IState {
    return { hasError: true }
  }

  componentDidCatch (error: Error, errorInfo: ErrorInfo): void {
    console.log(error, errorInfo)
  }

  render (): React.ReactNode {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }

    return this.props.children
  }
}

export default ErrorBoundary
