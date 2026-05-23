import { SignIn } from '@clerk/nextjs'
import { MessageSquare, Sparkles } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-2xl mb-6">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome back
        </h1>
        <p className="text-gray-400">
          Sign in to your Social Copilot account
        </p>
      </div>

      {/* Animated Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">
            Trusted by 10,000+ creators & businesses
          </span>
        </div>
      </div>

      {/* Sign In Form */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-transparent shadow-none',
              headerTitle: 'text-white text-2xl font-bold',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-white/10 border-white/20 text-white hover:bg-white/20',
              socialButtonsBlockButtonText: 'text-white',
              formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white',
              formFieldInput: 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500',
              footerActionLink: 'text-cyan-400 hover:text-cyan-300',
              identityPreviewEditButton: 'text-cyan-400',
              formFieldLabel: 'text-gray-300',
              formFieldSuccessText: 'text-green-400',
              formFieldErrorText: 'text-red-400',
            },
            layout: {
              socialButtonsPlacement: 'bottom',
              socialButtonsVariant: 'blockButton',
              logoPlacement: 'inside',
            },
            variables: {
              colorPrimary: '#8b5cf6',
              colorText: '#ffffff',
              colorTextSecondary: '#9ca3af',
              colorBackground: 'transparent',
              colorInputBackground: 'rgba(255, 255, 255, 0.05)',
              colorInputText: '#ffffff',
            },
          }}
          routing="hash"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />
      </div>

      {/* Footer Note */}
      <p className="text-center text-gray-500 text-sm">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
