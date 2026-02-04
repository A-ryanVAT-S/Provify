# Device pool manager for multi-device bug verification
from typing import Dict, List
from adbutils import adb


class DevicePool:
    def __init__(self):
        # Device registry: {serial: {"name": str}}
        self.devices: Dict[str, dict] = {}
    
    # Refresh connected devices from ADB
    def refresh(self) -> int:
        try:
            connected = adb.device_list()
            current_serials = set(d.serial for d in connected)
            
            # Remove disconnected devices
            for serial in list(self.devices.keys()):
                if serial not in current_serials:
                    del self.devices[serial]
            
            # Add new devices
            for device in connected:
                if device.serial not in self.devices:
                    # Get device model name
                    try:
                        name = device.prop.model or device.serial
                    except:
                        name = device.serial
                    self.devices[device.serial] = {"name": name}
            
            return len(self.devices)
        except Exception as e:
            print(f"[DevicePool] Error refreshing devices: {e}")
            return 0
    
    # Get count of connected devices
    def device_count(self) -> int:
        return len(self.devices)
    
    # Get list of all devices
    def get_all(self) -> List[dict]:
        return [
            {"serial": serial, "name": info["name"]}
            for serial, info in self.devices.items()
        ]
    
    # Get device name by serial
    def get_device_name(self, serial: str) -> str:
        if serial in self.devices:
            return self.devices[serial].get("name", serial)
        return serial


# Global device pool instance
device_pool = DevicePool()
