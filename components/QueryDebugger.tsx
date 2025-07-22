import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

interface QueryDebuggerProps {
  visible: boolean;
  onClose: () => void;
}

export const QueryDebugger: React.FC<QueryDebuggerProps> = ({
  visible,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const queries = queryClient.getQueryCache().getAll();
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);

  if (!visible) return null;

  const toggleQueryExpansion = (queryHash: string) => {
    setExpandedQuery(expandedQuery === queryHash ? null : queryHash);
  };

  const formatData = (data: any) => {
    try {
      if (Array.isArray(data)) {
        return `Array(${data.length} items)`;
      }
      if (typeof data === "object" && data !== null) {
        const keys = Object.keys(data);
        return `Object(${keys.length} keys)`;
      }
      return String(data);
    } catch {
      return "Complex data";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TanStack Query Debugger</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>
          Active Queries ({queries.length})
        </Text>

        {queries.length === 0 ? (
          <Text style={styles.emptyText}>No active queries</Text>
        ) : (
          queries.map((query) => {
            const isExpanded = expandedQuery === query.queryHash;
            const queryKeyString = JSON.stringify(query.queryKey, null, 2);

            return (
              <View key={query.queryHash} style={styles.queryItem}>
                <TouchableOpacity
                  onPress={() => toggleQueryExpansion(query.queryHash)}
                  style={styles.queryHeader}
                >
                  <Text style={styles.queryKey}>
                    {queryKeyString.split("\n")[0]}...
                  </Text>
                  <Text style={styles.expandIcon}>
                    {isExpanded ? "▼" : "▶"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.queryStatus}>
                  Status: {query.state.status}
                </Text>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.queryKeyFull}>{queryKeyString}</Text>

                    <Text style={styles.queryData}>
                      Data:{" "}
                      {query.state.data
                        ? formatData(query.state.data)
                        : "Not available"}
                    </Text>

                    {query.state.data ? (
                      <ScrollView
                        style={styles.dataPreview}
                        nestedScrollEnabled
                      >
                        <Text style={styles.dataText}>
                          {JSON.stringify(query.state.data, null, 2)}
                        </Text>
                      </ScrollView>
                    ) : null}

                    <Text style={styles.queryError}>
                      Error: {query.state.error ? "Yes" : "No"}
                    </Text>

                    {query.state.error && (
                      <Text style={styles.errorText}>
                        {String(query.state.error)}
                      </Text>
                    )}

                    <Text style={styles.queryInfo}>
                      Updated:{" "}
                      {new Date(query.state.dataUpdatedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => queryClient.invalidateQueries()}
          >
            <Text style={styles.refreshText}>Refresh All Queries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => queryClient.clear()}
          >
            <Text style={styles.clearText}>Clear All Queries</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    bottom: 50,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    color: "#888",
    fontSize: 12,
    fontStyle: "italic",
  },
  queryItem: {
    backgroundColor: "#2a2a2a",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#444",
  },
  queryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  queryKey: {
    color: "#4CAF50",
    fontSize: 10,
    fontFamily: "monospace",
    flex: 1,
  },
  expandIcon: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 10,
  },
  queryKeyFull: {
    color: "#4CAF50",
    fontSize: 9,
    fontFamily: "monospace",
    marginBottom: 5,
    backgroundColor: "#1a1a1a",
    padding: 5,
    borderRadius: 3,
  },
  queryStatus: {
    color: "#2196F3",
    fontSize: 11,
    marginBottom: 2,
  },
  queryData: {
    color: "#FF9800",
    fontSize: 11,
    marginBottom: 2,
  },
  queryError: {
    color: "#F44336",
    fontSize: 11,
    marginBottom: 2,
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  dataPreview: {
    maxHeight: 100,
    backgroundColor: "#1a1a1a",
    padding: 5,
    borderRadius: 3,
    marginVertical: 5,
  },
  dataText: {
    color: "#E0E0E0",
    fontSize: 8,
    fontFamily: "monospace",
  },
  errorText: {
    color: "#F44336",
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 2,
  },
  queryInfo: {
    color: "#9E9E9E",
    fontSize: 10,
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    alignItems: "center",
  },
  refreshText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  clearText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
