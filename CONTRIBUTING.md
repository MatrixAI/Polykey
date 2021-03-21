# Contributing to js-polykey

The following will be a set of guidelines relating to the documentation, and contributions for js-polykey. These are guidelnes, not rules, but do try to follow them. Use your judgement where necessary.

## Wiki Standards

This standard is mainly relevant to the developers. js-polykey is composed of several modules, each of which will require a simple explanation of what they do, and how they are intended to be used for those who haven't directly developed that module. To assist in this, try to follow the following structure when creating pages for the wiki:

~~~md
# Module Name
## Brief Introduction
* Talk briefly about what this module is used for. If we're writing a wiki for vaults for example, try to describe what a vault is, and what it does. When explaining, it can be helpful to try describe things in its primitives, as this will reduce confusion, though use your judgement. Just make it clear and brief.

## Internal Dependencies
* A list of the internal dependencies required.

## Interface
For each exported class or object or appropriate type from the module, describe its parts:
### `Class`

---
**Attributes:**
* `attribute`: `type`
  * brief description if necessary
* `attribute`: `type`
  * brief description if necessary

---
**Methods:**
* `Method Signature`
  * brief description, including usage if you think it is necessary to include.

## Expected Usage
```
/**
 * Think about the imports and dependencies that someone would
 * need to have
 * How would they construct the object?
 * How would they use the object to do things?
 */
```

## Other nuances with the modules.

In many cases these modules will have other nuances to talk about. Create a subsection for each, and talk about them.
~~~

Of course, not all these will be applicable for all modules, and some modules will require more explanation. The most important thing is the module's interface. This should act as a way for any developer to know that the module is able to perform these actions.
