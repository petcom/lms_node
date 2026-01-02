# Person Types

## IPersonName
```
{
  "first": "string",
  "middle": "string | null",
  "last": "string",
  "display": "string | null"
}
```

## IPersonAddress
```
{
  "line1": "string",
  "line2": "string | null",
  "city": "string",
  "region": "string | null",
  "postalCode": "string",
  "country": "string",
  "isPrimaryCorrespondence": "boolean | null",
  "isPrimaryBilling": "boolean | null"
}
```

## IPersonHonor
```
{
  "sex": "string | null",
  "gender": "string | null",
  "pronouns": "string | null",
  "honorific": "string | null"
}
```

## IPerson (Shared shape for Admin/Staff/Learner)
```
{
  "_id": "ObjectId",
  "name": IPersonName,
  "email": "string",
  "addresses": [IPersonAddress],
  "honor": IPersonHonor,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

## Lookup Collections
Stored in `lookups` with `{ type, value }`.

Example:
```
{ "type": "gender", "value": "NonBinary" }
```

Default lookup types:
- `sex`
- `gender`
- `pronouns`
- `honorific`
