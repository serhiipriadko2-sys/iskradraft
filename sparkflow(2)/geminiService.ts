
import { GoogleGenAI, Type } from "@google/genai";
import { LoadItem, AnalysisResult, ComponentRequest, ComponentResult, RoomLayoutRequest, LayoutGenerationResult, PanelConfig, SpecificationItem, ProjectAuditResult, PlanElement, Wall } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper to clean JSON text (remove markdown code blocks)
const cleanAndParseJson = <T>(text: string): T => {
    try {
        // Remove ```json and ``` or any markdown block wrappers
        const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
        return JSON.parse(cleaned) as T;
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("Failed to parse JSON response from AI");
    }
};

export const analyzeElectricalLoads = async (loads: LoadItem[]): Promise<AnalysisResult> => {
  try {
    const prompt = `
      Act as a Senior Electrical Engineer in Russia.
      Analyze the following list of electrical loads for a residential apartment or private house.
      Apply norms from SP 31-110-2003 (Design and mounting of electrical installations of residential and public buildings) and PUÉ (7th edition).

      Input Loads:
      ${JSON.stringify(loads)}

      Tasks:
      1. Calculate Total Installed Power (Pi).
      2. Calculate Design Power (Pp) using appropriate Demand Factors (Kc) for the specific appliance types and quantities.
      3. Calculate Design Current (Ip) for a standard 220V single-phase system (unless power suggests 3-phase > 15kW, then assume 380V).
      4. Suggest a logical grouping of circuits (e.g., separate lighting, wet zones with RCD recommendations, heavy appliances).
      5. Recommend cable sections (Copper, VVGng-LS) and circuit breaker ratings (Characteristic B or C) for each group.

      Return strictly JSON.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalInstalledPower: { type: Type.NUMBER, description: "Total installed power in kW (Sum of all loads)" },
            designPower: { type: Type.NUMBER, description: "Calculated design power (Pp) in kW applying SP 31-110-2003 demand factors" },
            designCurrent: { type: Type.NUMBER, description: "Calculated design current (Ip) in Amperes" },
            powerFactor: { type: Type.NUMBER, description: "Average weighted power factor (cos phi)" },
            demandFactor: { type: Type.NUMBER, description: "Applied demand factor (Kc)" },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific recommendations based on Russian norms (PUÉ, SP 31-110)"
            },
            suggestedGroups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  load: { type: Type.NUMBER },
                  breaker: { type: Type.STRING, description: "Recommended breaker (e.g., 'C16')" },
                  cable: { type: Type.STRING, description: "Recommended cable (e.g., 'VVGng-LS 3x2.5')" }
                }
              }
            }
          }
        }
      }
    });

    const text = result.text;
    if (!text) {
      throw new Error("No text response from Gemini");
    }
    return cleanAndParseJson<AnalysisResult>(text);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("Failed to analyze loads. Please check your inputs and try again.");
  }
};

export const parseLoadsFromText = async (description: string): Promise<LoadItem[]> => {
  try {
    const prompt = `
      Act as an Electrical Engineer Assistant.
      Extract a structured list of electrical loads from the following raw text (which might be a client message or room description).
      
      Text: "${description}"
      
      Rules:
      1. Estimate power (kW) if not specified (e.g. Washing machine = 2.2, Socket = 0.3, LED Light = 0.1).
      2. Categorize correctly: 'lighting', 'socket', 'heavy' (e.g. stove, heater), 'hvac' (AC, ventilation).
      3. Be smart about quantities (e.g. "5 sockets" -> count: 5).
      4. Generate unique IDs.
      
      Return strictly JSON array of LoadItems.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              power: { type: Type.NUMBER },
              count: { type: Type.INTEGER },
              category: { type: Type.STRING, enum: ['lighting', 'socket', 'heavy', 'hvac'] }
            }
          }
        }
      }
    });
    
    const text = result.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson<LoadItem[]>(text);

  } catch (error) {
    console.error("Parsing Loads Failed:", error);
    throw new Error("Failed to parse loads from text");
  }
};

export const selectComponent = async (req: ComponentRequest): Promise<ComponentResult> => {
  try {
    const prompt = `
      Act as a Russian Electrical Engineer.
      Select the appropriate cable and circuit breaker for a specific electrical circuit.
      Norms: PUÉ (7th Edition), SP 31-110-2003, GOST R 50571.5.52.
      
      Parameters:
      - Load Current: ${req.loadCurrent} A
      - Line Length: ${req.length} m
      - Voltage: ${req.voltage} V
      - Installation Method: ${req.installationMethod}
      - Derating Factors: Temperature K=${req.derating?.tempCoeff || 1}, Grouping K=${req.derating?.groupCoeff || 1}
      
      Constraints:
      - Cable: Copper, VVGng-LS.
      - Max Voltage Drop: 4%.
      - Breaker must protect the cable and withstand the load.
      - Apply derating factors to the cable's base capacity when checking.
      
      Return strictly JSON.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cableSection: { type: Type.STRING, description: "Recommended cable section (e.g. '3x2.5')" },
            breakerRating: { type: Type.STRING, description: "Recommended circuit breaker (e.g. 'C16')" },
            voltageDrop: { type: Type.NUMBER, description: "Calculated voltage drop in %" },
            isCompliant: { type: Type.BOOLEAN, description: "Does it meet norms?" },
            deratedCurrentCapacity: { type: Type.NUMBER, description: "The calculated safe current limit of the cable after applying correction factors"}
          }
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson<ComponentResult>(text);
  } catch (error) {
    console.error("Component Selection Failed:", error);
    throw new Error("Failed to select component.");
  }
};

export const checkCompliance = async (projectDescription: string): Promise<string> => {
    const prompt = `
        Check the following electrical project description for compliance with Russian norms (PUÉ 7, SP 31-110-2003, GOST R 50571).
        Focus on:
        1. RCD usage in wet zones (bathrooms, kitchens).
        2. Cable selection correctness.
        3. Grounding (TN-C-S / TN-S).
        
        Project Description: ${projectDescription}
        
        Provide a concise report in Russian, highlighting ERRORS, WARNINGS, and GOOD PRACTICES.
        Use Markdown formatting.
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      return result.text || "Нет ответа от ИИ";
    } catch (e) {
      console.error(e);
      return "Ошибка проверки норм.";
    }
}

export const generateRoomLayout = async (req: RoomLayoutRequest): Promise<LayoutGenerationResult> => {
  try {
    const prompt = `
      Act as an Electrical Design Engineer.
      Create a floor plan layout of electrical outlets (sockets), switches, and lighting for a room.
      
      Room Details:
      - Type: ${req.roomType}
      - Dimensions: ${req.width}m x ${req.length}m
      
      Apply standard Russian ergonomics and norms (SP 31-110-2003):
      - Sockets near likely appliance locations.
      - Switches near entrance.
      - General lighting in center.
      - DO NOT place elements outside the 0-100 range coordinates.
      
      Return strictly JSON containing an array of elements. 
      Coordinates x and y are percentages (0-100) relative to top-left.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING, description: "Brief explanation of the layout choice in Russian" },
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['socket', 'switch', 'light', 'appliance', 'db'] },
                  x: { type: Type.NUMBER, description: "X Position in % (0-100)" },
                  y: { type: Type.NUMBER, description: "Y Position in % (0-100)" },
                  label: { type: Type.STRING },
                  mountingHeight: { type: Type.NUMBER, description: "Height in cm" }
                }
              }
            }
          }
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson<LayoutGenerationResult>(text);
  } catch (error) {
    console.error("Layout Gen Failed:", error);
    throw new Error("Failed to generate layout");
  }
};

export const generatePanelLayout = async (loadsDescription: string): Promise<PanelConfig> => {
  try {
    const prompt = `
      Act as a Professional Electrical Engineer.
      Design a Distribution Board (Electrical Panel) layout based on the description of loads.
      
      Description: ${loadsDescription}
      
      Rules (SP 31-110-2003, PUÉ):
      1. Start with an Input Switch (Switch-disconnector) or Input Breaker.
      2. Add Voltage Monitoring Relay (Voltage protection).
      3. Group wet zones (bathroom, kitchen sockets) under RCDs (УЗО) or use RCBOs (Диф).
      4. Lighting usually goes to simple 10A breakers, often without RCD (unless strictly required).
      5. Sockets go to 16A breakers.
      6. Split into rows logically (e.g. Row 1: Input + Protection, Row 2: Lighting, Row 3: Power).
      
      Module Types: 'breaker_1p', 'breaker_2p', 'breaker_3p', 'rcd', 'diff', 'switch_3p', 'meter', 'relay'.
      Widths: 1p=1, 2p=2, 3p=3, rcd=2, diff=1 or 2, meter=4.
      
      Return strictly JSON with rows and modules.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enclosureSize: { type: Type.INTEGER, description: "Total module capacity" },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  modules: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['breaker_1p', 'breaker_2p', 'breaker_3p', 'rcd', 'diff', 'switch_3p', 'meter', 'relay'] },
                        name: { type: Type.STRING },
                        rating: { type: Type.STRING },
                        width: { type: Type.NUMBER },
                        color: { type: Type.STRING, nullable: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson<PanelConfig>(text);
  } catch (error) {
    console.error("Panel Gen Failed:", error);
    throw new Error("Failed to generate panel layout");
  }
};

export const auditProjectSpecification = async (spec: SpecificationItem[]): Promise<ProjectAuditResult> => {
  try {
    const prompt = `
      Act as a Chief Electrical Engineer performing a QA check on a Bill of Materials.
      Review the list of materials for completeness, logic, and phase balancing considerations (indirectly).
      
      Specification: ${JSON.stringify(spec)}
      
      Check for:
      - Forgotten accessories (e.g., if there is cable, is there conduit/clips? if there are breakers, is there a box/DIN rail?)
      - Mismatches (e.g., cable capacity vs breaker rating logic conceptually)
      - Sufficient stock (approximate +10-15% margin on cable).
      
      Return strictly JSON.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "0-100 Quality Score" },
            summary: { type: Type.STRING, description: "Brief audit summary in Russian" },
            missingItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of potentially missing items" },
            optimizations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optimization suggestions" }
          }
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson<ProjectAuditResult>(text);
  } catch (error) {
    console.error("Audit Failed:", error);
    throw new Error("Failed to audit specification");
  }
};

export const recognizePlanFromImage = async (base64Image: string): Promise<{ walls: Wall[], elements: PlanElement[], width?: number, length?: number }> => {
  try {
    const prompt = `
      Act as a CAD Engineer. Analyze this architectural floor plan image.
      
      Tasks:
      1. Identify the room boundaries/walls. Create a simplified vector representation of walls (x1, y1 to x2, y2).
         Coordinate system: Top-left is 0,0. Bottom-right is 100,100.
         Return walls as percentage coordinates (0-100).
      
      2. Identify any existing electrical symbols if visible (sockets, switches).
         If it's just an architectural plan without electricity, identify logical places for devices:
         - Place a 'switch' near the likely entrance (door).
         - Place a 'window' element if a window is visible.
         - Place a 'door' element if a door is visible.
      
      3. Estimate the aspect ratio of the room.
         Estimate width and length in meters (standard assumptions: door is 0.8m).
      
      Return strictly JSON.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            width: { type: Type.NUMBER, description: "Estimated width in meters" },
            length: { type: Type.NUMBER, description: "Estimated length in meters" },
            walls: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   x1: { type: Type.NUMBER },
                   y1: { type: Type.NUMBER },
                   x2: { type: Type.NUMBER },
                   y2: { type: Type.NUMBER }
                }
              }
            },
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   type: { type: Type.STRING, enum: ['socket', 'switch', 'light', 'door', 'window'] },
                   x: { type: Type.NUMBER },
                   y: { type: Type.NUMBER },
                   label: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = result.text;
    if (!text) throw new Error("No text response");
    
    const data = cleanAndParseJson<any>(text);
    
    // Post-process to add IDs
    const walls = (data.walls || []).map((w: any) => ({ ...w, id: `w-${Date.now()}-${Math.random()}`, thickness: 6 }));
    const elements = (data.elements || []).map((e: any) => ({ ...e, id: `el-${Date.now()}-${Math.random()}`, mountingHeight: e.type === 'switch' ? 90 : 30 }));
    
    return {
      walls,
      elements,
      width: data.width || 6,
      length: data.length || 4
    };
  } catch (error) {
    console.error("Plan Recognition Failed:", error);
    throw new Error("Failed to recognize plan");
  }
};
