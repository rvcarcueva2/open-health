// OpenHIM HTTP transaction port — routes Patient to OpenCR, everything else to HAPI FHIR
//
// Replace with your machine's local IP address (not localhost — the emulator/device
// needs to reach the host machine over the network).
//
// Find your IP:
//   Windows: ipconfig → Wi-Fi/Ethernet IPv4
//   macOS:   ifconfig en0 → inet
//   Linux:   ip addr show → LAN IP
//
export const API_URL =
  "http://192.168.254.167:5001/fhir";
