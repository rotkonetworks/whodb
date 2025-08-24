import React from "react";
import { Github, RefreshCcw } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, Card, Separator } from "@/lib/ui"
import { Card } from "@/lib/ui"
import { Separator } from "@/lib/ui"

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Detailed error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    return this.state.hasError ? (
      <div className="min-h-screen w-full bg-[#1E1E1E] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-6 space-y-6 bg-[#2A2A2A] border-[#E6007A]/20 text-white">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-32 h-32">
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                Oops! Something went wrong.
              </h1>
              <p className="text-gray-400">
                We're sorry, but it seems like something has gone wrong. Please try refreshing the page.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="bg-[#E6007A] hover:bg-[#E6007A]/90 text-white font-bold"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Need Help?</h2>
            <div className="flex flex-col items-start gap-2">
              <a
                href="mailto:support@example.com"
                className="text-[#E6007A] hover:underline"
              >
                support@example.com
              </a>
              <Separator className="w-32 bg-gray-700" />
              <a
                href="https://github.com/your-org/your-repo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#E6007A] hover:underline"
              >
                <Github className="h-4 w-4" />
                Visit our GitHub repository
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Technical Details</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="component-stack">
                <AccordionTrigger className="bg-background text-[#E6007A]">
                  Show Component Stack
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-[#1E1E1E] p-4 rounded-md overflow-x-auto text-sm text-gray-300">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="error-message">
                <AccordionTrigger className="bg-background text-[#E6007A]">
                  Show Error Message
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-[#1E1E1E] p-4 rounded-md overflow-x-auto text-sm text-gray-300">
                    {this.state.error?.message}
                    {this.state.error?.stack}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>
      </div>
    ) : (
      this.props.children
    );
  }
}
