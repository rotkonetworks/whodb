"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface NetworkOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  badge: string
  badgeColor: string
  features: string[]
}

interface NetworkSelectionProps {
  networks: NetworkOption[]
  selectedNetwork: string | null
  onSelect: (networkId: string) => void
  hoveredNetwork: string | null
  setHoveredNetwork: (networkId: string | null) => void
}

export const NetworkSelection: React.FC<NetworkSelectionProps> = ({
  networks,
  selectedNetwork,
  onSelect,
  hoveredNetwork,
  setHoveredNetwork,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {networks.map((network) => (
          <Card
            key={network.id}
            className={`cursor-pointer transition-all duration-200 bg-gray-800/50 ${network.color} ${
              selectedNetwork === network.id
                ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-pink-500"
                : "border-gray-700"
            } ${hoveredNetwork === network.id ? "shadow-lg sm:scale-[1.02]" : ""}`}
            onMouseEnter={() => setHoveredNetwork(network.id)}
            onMouseLeave={() => setHoveredNetwork(null)}
            onClick={() => onSelect(network.id)}
            role="radio"
            aria-checked={selectedNetwork === network.id}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(network.id)
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-6 h-6 flex-shrink-0">
                    {React.cloneElement(network.icon as React.ReactElement, {
                      className: "w-full h-full",
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm">{network.name}</h3>
                    <p className="text-xs text-gray-400 leading-tight">{network.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <Badge className={`${network.badgeColor} text-xs px-1.5 py-0.5`}>{network.badge}</Badge>
                  {selectedNetwork === network.id && <Check className="w-4 h-4 text-green-400" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mt-1.5">
                {network.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-300">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5 flex-shrink-0"></div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
