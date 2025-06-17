export type Contract = {
  "version": "0.1.0",
  "name": "contract",
  "instructions": [
    {
      "name": "initializeDocument",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ipfsHash",
          "type": "string"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "initializePatientProfile",
      "accounts": [
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initializeDoctorProfile",
      "accounts": [
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "grantAccess",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "doctorPubkey",
          "type": "publicKey"
        },
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "revokeAccess",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "doctorPubkey",
          "type": "publicKey"
        },
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteDocument",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "document",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "salt",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "accessList",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "patientProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "documents",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "doctorProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "documents",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized access attempt."
    },
    {
      "code": 6001,
      "name": "NoPatientProfile",
      "msg": "Attempted to create a document without being a valid patient."
    }
  ]
};

export const IDL: Contract = {
  "version": "0.1.0",
  "name": "contract",
  "instructions": [
    {
      "name": "initializeDocument",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ipfsHash",
          "type": "string"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "initializePatientProfile",
      "accounts": [
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "initializeDoctorProfile",
      "accounts": [
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "grantAccess",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "doctorPubkey",
          "type": "publicKey"
        },
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "revokeAccess",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "doctorProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "doctorPubkey",
          "type": "publicKey"
        },
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteDocument",
      "accounts": [
        {
          "name": "document",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "patientProfile",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ipfsHash",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "document",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ipfsHash",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "salt",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "accessList",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "patientProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "documents",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "doctorProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "documents",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized access attempt."
    },
    {
      "code": 6001,
      "name": "NoPatientProfile",
      "msg": "Attempted to create a document without being a valid patient."
    }
  ]
};
