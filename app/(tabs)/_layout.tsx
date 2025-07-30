import { Tabs, useRouter } from "expo-router";
import {
  TrendingUp,
  Calculator,
  Gavel,
  Crown,
  User,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { TouchableOpacity } from "react-native";

export default function TabLayout() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  const handleAuthRequiredTab = (tabName: string) => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
      return false;
    }
    return true;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(26, 26, 26, 0.95)",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          paddingBottom: 30,
          paddingTop: 15,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderBottomWidth: 0,
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.4)",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "시세",
          tabBarIcon: ({ color }) => (
            <TrendingUp size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: "계산기",
          tabBarIcon: ({ color }) => (
            <Calculator size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="auction"
        options={{
          title: "경매",
          tabBarIcon: ({ color }) => (
            <Gavel size={22} color={color} strokeWidth={2.5} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                if (!isLoading && !isLoggedIn) {
                  e.preventDefault();
                  router.push("/login");
                } else {
                  props.onPress?.(e);
                }
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: "프리미엄",
          tabBarIcon: ({ color }) => (
            <Crown size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My",
          tabBarIcon: ({ color }) => (
            <User size={22} color={color} strokeWidth={2.5} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                if (!isLoading && !isLoggedIn) {
                  e.preventDefault();
                  router.push("/login");
                } else {
                  props.onPress?.(e);
                }
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
