import json

def main():
    with open('package.json', 'r') as f:
        data = json.load(f)

    if 'overrides' not in data:
        data['overrides'] = {}

    data['overrides']['postcss'] = "^8.5.10"

    with open('package.json', 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    main()
