"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useNetwork, type Network } from "@/contexts/network-context"

export function NetworkSelector() {
  const { network, setNetwork, networkColor } = useNetwork()
  const [isOpen, setIsOpen] = useState(false)

  const networks = [
    { id: "paseo", name: "Paseo", description: "Free to use" },
    { id: "polkadot", name: "Polkadot", description: "Main network" },
    { id: "kusama", name: "Kusama", description: "Private verification" },
  ]

  const handleNetworkChange = (newNetwork: Network) => {
    setNetwork(newNetwork)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md border border-gray-700 bg-gray-800 ${networkColor}`}
      >
        <span>{networks.find((n) => n.id === network)?.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700 z-50">
          <div className="py-1">
            {networks.map((net) => (
              <button
                key={net.id}
                className={`w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center justify-between ${
                  network === net.id ? "bg-gray-700" : ""
                }`}
                onClick={() => handleNetworkChange(net.id as Network)}
              >
                <span
                  className={
                    net.id === "paseo" ? "text-pink-500" : net.id === "polkadot" ? "text-purple-500" : "text-cyan-500"
                  }
                >
                  {net.name}
                </span>
                <span className="text-xs text-gray-400">{net.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
